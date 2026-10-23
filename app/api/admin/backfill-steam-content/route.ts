import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const BATCH_SIZE = 5;
const REQUEST_DELAY_MS = 4000;
const DEFAULT_COOLDOWN_SECONDS = 60 * 60;
const TEMPORARY_FAILURE_COOLDOWN_SECONDS = 5 * 60;

type SteamContentDescriptors = {
  ids?: number[];
  notes?: string;
};

type SteamAppDetails = {
  success?: boolean;
  data?: {
    type?: string;
    name?: string;
    required_age?: number | string;
    content_descriptors?: SteamContentDescriptors;
  };
};

type BackfillGame = {
  id: string;
  steam_app_id: string | number;
  title: string | null;
};

type BackfillResult = {
  appId: string;
  title: string;
  success: boolean;
  isNsfw?: boolean;
  message: string;
};

const EXPLICIT_ADULT_CONTENT_PATTERNS = [
  /\badult[\s-]*only sexual content\b/i,
  /\bexplicit sexual content\b/i,
  /\bsexually explicit content\b/i,
  /\bexplicit sex\b/i,
  /\bexplicit sexual activity\b/i,
  /\bexplicit sexual acts?\b/i,
  /\bsexual intercourse\b/i,
  /\bgraphic sexual content\b/i,
  /\bgraphic sex\b/i,
  /\bpornographic\b/i,
  /\bpornography\b/i,
  /\bhardcore sexual\b/i,
  /\bhardcore sex\b/i,
];

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parseRequiredAge(value?: number | string): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.floor(parsed);
}

function getContentDescriptorIds(
  contentDescriptors?: SteamContentDescriptors
): number[] {
  if (!contentDescriptors || !Array.isArray(contentDescriptors.ids)) {
    return [];
  }

  return contentDescriptors.ids.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  );
}

function isExplicitAdultContent(notes?: string): boolean {
  if (!notes) {
    return false;
  }

  const normalizedNotes = notes.trim();

  if (!normalizedNotes) {
    return false;
  }

  return EXPLICIT_ADULT_CONTENT_PATTERNS.some((pattern) =>
    pattern.test(normalizedNotes)
  );
}

function getRetryAfterSeconds(response: Response): number {
  const header = response.headers.get("retry-after");

  if (header) {
    const seconds = Number(header);

    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(Math.ceil(seconds), 86400);
    }

    const retryDate = Date.parse(header);

    if (!Number.isNaN(retryDate)) {
      return Math.min(
        Math.max(0, Math.ceil((retryDate - Date.now()) / 1000)),
        86400
      );
    }
  }

  return DEFAULT_COOLDOWN_SECONDS;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return `Steam request timed out after 10 seconds (${error.name}).`;
    }

    return `${error.name}: ${error.message}`;
  }

  return "Unknown network error.";
}

export async function POST(request: Request) {
  try {
    const configuredWorkerSecret = process.env.STEAM_WORKER_SECRET;
    const suppliedWorkerSecret = request.headers.get(
      "x-steam-worker-secret"
    );

    const workerAuthenticated =
      Boolean(configuredWorkerSecret) &&
      Boolean(suppliedWorkerSecret) &&
      suppliedWorkerSecret === configuredWorkerSecret;

    const supabase = await createClient();

    if (!workerAuthenticated) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          {
            error:
              "You must be logged in or provide valid worker authentication.",
          },
          { status: 401 }
        );
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || profile?.role !== "admin") {
        return NextResponse.json(
          { error: "Admin access required." },
          { status: 403 }
        );
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase server configuration is missing." },
        { status: 500 }
      );
    }

    const adminSupabase = createSupabaseClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    /*
     * The content backfill shares the same Steam cooldown as the main
     * catalogue worker. If Steam has requested a cooldown, this route
     * will not make any additional Steam requests.
     */
    const { data: control, error: controlError } = await adminSupabase
      .from("steam_catalogue_control")
      .select("cooldown_until")
      .eq("id", 1)
      .single();

    if (controlError || !control) {
      return NextResponse.json(
        {
          error:
            "Could not check the Steam cooldown. No backfill requests were made.",
        },
        { status: 503 }
      );
    }

    if (control.cooldown_until) {
      const remainingMs =
        new Date(control.cooldown_until).getTime() - Date.now();

      if (remainingMs > 0) {
        const cooldownSeconds = Math.ceil(remainingMs / 1000);

        return NextResponse.json({
          success: false,
          retryable: true,
          rateLimited: true,
          cooldownSeconds,
          processed: 0,
          remaining: null,
          results: [],
          message: `Steam cooldown is active. Wait approximately ${Math.ceil(
            cooldownSeconds / 60
          )} minute(s) before continuing the content backfill.`,
        });
      }
    }

    /*
     * required_age is the backfill marker.
     *
     * Existing catalogue rows created before the NSFW metadata feature
     * have required_age = null.
     *
     * Newly processed/backfilled Steam records normally receive an integer,
     * including 0 when Steam reports no minimum age.
     *
     * We deliberately do not compare the PostgreSQL integer-array field
     * content_descriptor_ids with [] through PostgREST because that caused
     * the original backfill query to fail.
     */
    const { data: games, error: gamesError } = await adminSupabase
      .from("imported_games")
      .select("id, steam_app_id, title")
      .eq("catalogue_eligible", true)
      .eq("metadata_backfill_status", "complete")
      .is("required_age", null)
      .order("last_synced_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (gamesError) {
      console.error(
        "Could not load Steam content backfill games:",
        gamesError.message
      );

      return NextResponse.json(
        {
          error: "Could not load games requiring content backfill.",
          details: gamesError.message,
        },
        { status: 500 }
      );
    }

    const backfillGames = (games ?? []) as BackfillGame[];

    if (backfillGames.length === 0) {
      return NextResponse.json({
        success: true,
        complete: true,
        processed: 0,
        updated: 0,
        remaining: 0,
        nsfwFound: 0,
        failed: 0,
        results: [],
        message:
          "Steam content backfill is complete. No eligible catalogue games remain.",
      });
    }

    const results: BackfillResult[] = [];

    for (let index = 0; index < backfillGames.length; index++) {
      const gameRow = backfillGames[index];
      const appId = String(gameRow.steam_app_id);
      const fallbackTitle = gameRow.title ?? appId;

      if (index > 0) {
        await wait(REQUEST_DELAY_MS);
      }

      let response: Response;

      try {
        const params = new URLSearchParams({
          appids: appId,
          l: "en",
        });

        response = await fetch(
          `https://store.steampowered.com/api/appdetails?${params.toString()}`,
          {
            cache: "no-store",
            signal: AbortSignal.timeout(10000),
          }
        );
      } catch (error) {
        const detail = getErrorMessage(error);

        console.error(
          `Steam content backfill request failed for ${appId}: ${detail}`
        );

        return NextResponse.json({
          success: false,
          retryable: true,
          rateLimited: false,
          cooldownSeconds: TEMPORARY_FAILURE_COOLDOWN_SECONDS,
          processed: results.length,
          results,
          message:
            `Steam request failed for ${fallbackTitle} (${appId}): ${detail}. ` +
            "Backfill stopped without changing the remaining games.",
        });
      }

      if (!response.ok) {
        const detail =
          `Steam returned HTTP ${response.status} ${response.statusText}`.trim();

        if (response.status === 429 || response.status >= 500) {
          const cooldownSeconds =
            response.status === 429
              ? getRetryAfterSeconds(response)
              : TEMPORARY_FAILURE_COOLDOWN_SECONDS;

          if (response.status === 429) {
            const cooldownUntil = new Date(
              Date.now() + cooldownSeconds * 1000
            ).toISOString();

            const { error: cooldownError } = await adminSupabase
              .from("steam_catalogue_control")
              .update({
                cooldown_until: cooldownUntil,
                updated_at: new Date().toISOString(),
              })
              .eq("id", 1);

            if (cooldownError) {
              console.error(
                "Could not save Steam cooldown:",
                cooldownError.message
              );
            }
          }

          return NextResponse.json({
            success: false,
            retryable: true,
            rateLimited: response.status === 429,
            cooldownSeconds,
            processed: results.length,
            results,
            message:
              `${detail} while backfilling ${fallbackTitle} (${appId}). ` +
              "Backfill stopped safely.",
          });
        }

        results.push({
          appId,
          title: fallbackTitle,
          success: false,
          message: detail,
        });

        continue;
      }

      let payload: Record<string, SteamAppDetails>;

      try {
        payload = (await response.json()) as Record<
          string,
          SteamAppDetails
        >;
      } catch (error) {
        const detail = getErrorMessage(error);

        return NextResponse.json({
          success: false,
          retryable: true,
          rateLimited: false,
          cooldownSeconds: TEMPORARY_FAILURE_COOLDOWN_SECONDS,
          processed: results.length,
          results,
          message:
            `Steam returned invalid JSON while backfilling ${fallbackTitle} ` +
            `(${appId}): ${detail}`,
        });
      }

      const steamResult = payload?.[appId];

      if (
        !steamResult ||
        steamResult.success !== true ||
        !steamResult.data
      ) {
        /*
         * Leave required_age as null so this game remains available for
         * a future retry rather than being incorrectly marked complete.
         */
        results.push({
          appId,
          title: fallbackTitle,
          success: false,
          message: "Steam did not provide app details.",
        });

        continue;
      }

      const steamGame = steamResult.data;

      const requiredAge = parseRequiredAge(steamGame.required_age);

      const contentDescriptorIds = getContentDescriptorIds(
        steamGame.content_descriptors
      );

      const contentDescriptorNotes =
        steamGame.content_descriptors?.notes?.trim() || null;

      const isNsfw = isExplicitAdultContent(
        contentDescriptorNotes ?? undefined
      );

      const { error: updateError } = await adminSupabase
        .from("imported_games")
        .update({
          required_age: requiredAge,
          content_descriptor_ids: contentDescriptorIds,
          content_descriptor_notes: contentDescriptorNotes,
          is_nsfw: isNsfw,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", gameRow.id);

      if (updateError) {
        console.error(
          `Could not save Steam content metadata for ${appId}:`,
          updateError.message
        );

        results.push({
          appId,
          title: steamGame.name ?? fallbackTitle,
          success: false,
          message: `Could not save content metadata: ${updateError.message}`,
        });

        continue;
      }

      results.push({
        appId,
        title: steamGame.name ?? fallbackTitle,
        success: true,
        isNsfw,
        message: isNsfw
          ? "Content metadata saved. Explicit adult content detected."
          : "Content metadata saved. No explicit adult content detected.",
      });
    }

    /*
     * Count the eligible catalogue records that still have not received
     * the new Steam content metadata.
     */
    const { count: remaining, error: remainingError } =
      await adminSupabase
        .from("imported_games")
        .select("*", { count: "exact", head: true })
        .eq("catalogue_eligible", true)
        .eq("metadata_backfill_status", "complete")
        .is("required_age", null);

    if (remainingError) {
      console.error(
        "Could not count remaining Steam content backfill games:",
        remainingError.message
      );
    }

    const successful = results.filter((result) => result.success);
    const failed = results.filter((result) => !result.success);
    const nsfwFound = successful.filter(
      (result) => result.isNsfw === true
    );

    return NextResponse.json({
      success: true,
      complete: (remaining ?? 0) === 0,
      processed: results.length,
      updated: successful.length,
      failed: failed.length,
      nsfwFound: nsfwFound.length,
      remaining: remaining ?? null,
      results,
      message:
        `Processed ${results.length} catalogue games. ` +
        `${successful.length} updated, ` +
        `${nsfwFound.length} classified as NSFW, ` +
        `${failed.length} failed. ` +
        `${remaining ?? "Unknown number of"} games remain.`,
    });
  } catch (error) {
    console.error("Steam content backfill error:", error);

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while backfilling Steam content metadata.",
        details:
          error instanceof Error
            ? error.message
            : "Unknown server error.",
      },
      { status: 500 }
    );
  }
}