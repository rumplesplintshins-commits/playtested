import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const BATCH_SIZE = 5;
const REQUEST_DELAY_MS = 4000;
const DEFAULT_COOLDOWN_SECONDS = 1800;
const TEMPORARY_FAILURE_COOLDOWN_SECONDS = 300;
const MAX_ATTEMPTS = 5;

type CatalogueReviewStatus = "eligible" | "held_for_review" | "excluded";

type SteamAppDetails = {
  success?: boolean;
  data?: {
    type?: string;
    name?: string;
    developers?: string[];
    publishers?: string[];
    genres?: { description?: string }[];
    short_description?: string;
    header_image?: string;
    is_free?: boolean;
    price_overview?: { final_formatted?: string };
    release_date?: { date?: string };
  };
};

type ExistingGame = {
  developer_name: string | null;
  publisher_name: string | null;
  genre: string | null;
  description: string | null;
  image_url: string | null;
  price: string | null;
  release_date: string | null;
};

type QueueItem = {
  steam_app_id: string | number;
  app_name?: string | null;
  attempts?: number | null;
};

type ResultItem = {
  appId: string;
  title: string;
  status: "imported" | "not_game" | "excluded" | "failed";
  message: string;
};

const AAA_TITLE_PATTERNS = [
  /\bcyberpunk\s*2077\b/i,
  /\bcall of duty\b/i,
  /\bgrand theft auto\b/i,
  /\bgta\s*(v|5)\b/i,
  /\bred dead redemption\b/i,
  /\bred faction\b/i,
  /\bassassin'?s creed\b/i,
  /\bfar cry\b/i,
  /\bbattlefield\b/i,
  /\bcompany of heroes\b/i,
  /\bea sports fc\b/i,
  /\bfifa \d{2,4}\b/i,
  /\bmadden nfl\b/i,
  /\bnba 2k\d{2}\b/i,
  /\bthe elder scrolls\b/i,
  /\bfallout\s*(3|4|76)\b/i,
  /\bstarfield\b/i,
  /\bdiablo (ii|iii|iv|2|3|4)\b/i,
  /\boverwatch 2?\b/i,
  /\bleague of legends\b/i,
  /\bvalorant\b/i,
  /\bforza horizon\b/i,
  /\bforza motorsport\b/i,
  /\bhalo (infinite|master chief collection)\b/i,
  /\bgod of war\b/i,
  /\bmarvel'?s spider-man\b/i,
  /\bthe last of us\b/i,
  /\bfinal fantasy vii remake\b/i,
  /\bfinal fantasy xvi\b/i,
  /\bresident evil [2-9]\b/i,
  /\bmonster hunter (world|rise|wilds)\b/i,
  /\bmortal kombat 1[12]\b/i,
  /\bhogwarts legacy\b/i,
  /\bsilent hill\b/i,
  /\bthe sims\b/i,
  /\bneed for speed\b/i,
  /\bstar wars battlefront\b/i,
];

const NON_GAME_GENRES = new Set([
  "video production",
  "animation & modeling",
  "design & illustration",
  "software training",
  "utilities",
  "web publishing",
  "audio production",
]);

function getObviousNonGameReason(title: string): string | null {
  const patterns: [RegExp, string][] = [
    [
      /\bofficial\s+(original\s+)?soundtrack\b|\boriginal\s+soundtrack\b|\bsoundtrack\b/i,
      "Soundtrack listing",
    ],
    [/\bdigital\s+artbook\b|\bartbook\b/i, "Artbook listing"],
    [/\bseason pass\b/i, "Season pass listing"],
    [/\bexpansion pass\b|\bexpansion pack\b/i, "Expansion content"],
    [/\bDLC\b/i, "DLC listing"],
    [/\bdedicated server\b|\bgame server\b/i, "Server software"],
    [/\bsoftware development kit\b|\bSDK\b/i, "Development tool"],
    [/\blevel editor\b|\bmap editor\b|\bmodding tools\b/i, "Development tool"],
    [/\bwallpaper pack\b|\bdigital art collection\b/i, "Supplementary content"],
  ];

  for (const [pattern, reason] of patterns) {
    if (pattern.test(title.trim())) {
      return `${reason}: excluded before requesting Steam details.`;
    }
  }

  return null;
}

function parseReleaseDate(value?: string): string | null {
  if (!value) return null;

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString().slice(0, 10);
}

function normalizedName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Eligibility is not verification.
 * Publisher or developer size alone does not disqualify a game.
 */
function getIndieExclusionReason(
  title: string,
  genres: string[]
): string | null {
  if (AAA_TITLE_PATTERNS.some((pattern) => pattern.test(title))) {
    return "Excluded by the major-franchise title filter.";
  }

  const normalizedGenres = genres.map(normalizedName);

  const onlyNonGameGenres =
    normalizedGenres.length > 0 &&
    normalizedGenres.every((genre) => NON_GAME_GENRES.has(genre));

  if (onlyNonGameGenres) {
    return "Excluded because the Steam listing only has non-game software categories.";
  }

  if (!normalizedGenres.includes("indie")) {
    return "Held back from the preliminary indie catalogue because Steam's genre metadata does not explicitly include Indie.";
  }

  return null;
}

function getCatalogueReviewStatus(
  reason: string | null
): CatalogueReviewStatus {
  if (!reason) return "eligible";

  if (reason.startsWith("Held back")) {
    return "held_for_review";
  }

  return "excluded";
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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

async function updateQueueItem(
  adminSupabase: any,
  appId: string,
  values: Record<string, unknown>
) {
  const { error } = await adminSupabase
    .from("steam_catalogue_queue")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("steam_app_id", appId);

  if (error) {
    throw new Error(`Queue update failed for ${appId}: ${error.message}`);
  }
}

async function deferRemainingItems(
  adminSupabase: any,
  items: QueueItem[],
  errorMessage: string
) {
  for (const item of items) {
    const appId = String(item.steam_app_id);

    const { error } = await adminSupabase
      .from("steam_catalogue_queue")
      .update({
        status: "pending",
        attempts: Math.max(0, Number(item.attempts ?? 1) - 1),
        last_error: errorMessage.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("steam_app_id", appId);

    if (error) {
      console.error(
        `Could not defer Steam queue item ${appId}:`,
        error.message
      );
    }
  }
}

function getCounts(results: ResultItem[]) {
  return {
    processed: results.length,
    imported: results.filter((r) => r.status === "imported").length,
    notGames: results.filter((r) => r.status === "not_game").length,
    excluded: results.filter((r) => r.status === "excluded").length,
    failed: results.filter((r) => r.status === "failed").length,
  };
}

async function storeCooldown(adminSupabase: any, seconds: number) {
  const cooldownUntil = new Date(
    Date.now() + seconds * 1000
  ).toISOString();

  const { error } = await adminSupabase
    .from("steam_catalogue_control")
    .update({
      cooldown_until: cooldownUntil,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    console.error("Could not persist Steam cooldown:", error.message);
    throw new Error(
      "The Steam cooldown could not be saved. Processing has been stopped for safety. Check the steam_catalogue_control table."
    );
  }

  return cooldownUntil;
}

async function deferAndStop(
  adminSupabase: any,
  queueItems: QueueItem[],
  index: number,
  results: ResultItem[],
  message: string,
  cooldownSeconds: number,
  rateLimited = false
) {
  await deferRemainingItems(
    adminSupabase,
    queueItems.slice(index),
    message
  );

  if (rateLimited) {
    try {
      await storeCooldown(adminSupabase, cooldownSeconds);
    } catch (error) {
      console.error("Steam cooldown persistence failed:", error);

      return NextResponse.json(
        {
          success: false,
          retryable: true,
          rateLimited: true,
          cooldownSeconds,
          ...getCounts(results),
          message:
            error instanceof Error
              ? error.message
              : "Could not save the Steam cooldown. Stop processing.",
          results,
        },
        { status: 503 }
      );
    }
  }

  return NextResponse.json({
    success: false,
    retryable: true,
    rateLimited,
    cooldownSeconds,
    ...getCounts(results),
    message,
    results,
  });
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

    const { data: control, error: controlError } = await adminSupabase
      .from("steam_catalogue_control")
      .select("cooldown_until")
      .eq("id", 1)
      .single();

    if (controlError || !control) {
      console.error("Could not read Steam cooldown:", controlError?.message);

      return NextResponse.json(
        {
          error:
            "Could not check the Steam cooldown. No queue items were claimed. Check the steam_catalogue_control table.",
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
          imported: 0,
          notGames: 0,
          excluded: 0,
          failed: 0,
          results: [],
          message: `Steam cooldown is active. No games were claimed or requested. Wait approximately ${Math.ceil(
            cooldownSeconds / 60
          )} minute(s) before trying again.`,
        });
      }
    }

    const { data: claimed, error: claimError } =
      await adminSupabase.rpc("claim_steam_catalogue_batch", {
        batch_size: BATCH_SIZE,
      });

    if (claimError) {
      console.error("Steam queue claim failed:", claimError.message);

      return NextResponse.json(
        { error: "Could not claim games from the Steam queue." },
        { status: 500 }
      );
    }

    if (!claimed || claimed.length === 0) {
      const { count, error: countError } = await adminSupabase
        .from("steam_catalogue_queue")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (countError) {
        return NextResponse.json(
          {
            error:
              "No games were claimed, and queue status could not be checked.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        processed: 0,
        imported: 0,
        notGames: 0,
        excluded: 0,
        failed: 0,
        pending: count ?? 0,
        message:
          (count ?? 0) > 0
            ? "No games could be claimed. Some may already be processing or awaiting retry."
            : "No pending games are available to process.",
        results: [],
      });
    }

    const queueItems = claimed as QueueItem[];
    const results: ResultItem[] = [];
    let steamRequestsMade = 0;

    for (let index = 0; index < queueItems.length; index++) {
      const item = queueItems[index];
      const appId = String(item.steam_app_id);
      const fallbackTitle = String(item.app_name ?? appId);

      const obviousNonGameReason =
        getObviousNonGameReason(fallbackTitle);

      if (obviousNonGameReason) {
        const { error: eligibilityError } = await adminSupabase
          .from("imported_games")
          .update({
            catalogue_eligible: false,
            catalogue_review_status: "excluded",
            catalogue_review_reason: obviousNonGameReason,
          })
          .eq("steam_app_id", appId);

        if (eligibilityError) {
          await updateQueueItem(adminSupabase, appId, {
            status: "failed",
            last_error: `Could not exclude listing: ${eligibilityError.message}`,
          });

          results.push({
            appId,
            title: fallbackTitle,
            status: "failed",
            message:
              "Could not save the exclusion. The listing needs retrying.",
          });

          continue;
        }

        await updateQueueItem(adminSupabase, appId, {
          status: "not_game",
          last_error: obviousNonGameReason,
        });

        results.push({
          appId,
          title: fallbackTitle,
          status: "not_game",
          message: obviousNonGameReason,
        });

        continue;
      }

      if (steamRequestsMade > 0) {
        await wait(REQUEST_DELAY_MS);
      }

      steamRequestsMade++;

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
          `Steam request failed for App ID ${appId}: ${detail}`
        );

        return deferAndStop(
          adminSupabase,
          queueItems,
          index,
          results,
          `Steam request failed for App ID ${appId}: ${detail}. Remaining listings were returned to the queue without consuming attempts.`,
          TEMPORARY_FAILURE_COOLDOWN_SECONDS
        );
      }

      if (!response.ok) {
        const detail =
          `Steam returned HTTP ${response.status} ${response.statusText}`.trim();

        console.error(
          `Steam appdetails failure for App ID ${appId}: ${detail}`
        );

        if (response.status === 429 || response.status >= 500) {
          const cooldownSeconds =
            response.status === 429
              ? getRetryAfterSeconds(response)
              : TEMPORARY_FAILURE_COOLDOWN_SECONDS;

          return deferAndStop(
            adminSupabase,
            queueItems,
            index,
            results,
            `${detail} for App ID ${appId}. The remaining batch was returned to the queue without consuming attempts.`,
            cooldownSeconds,
            response.status === 429
          );
        }

        await updateQueueItem(adminSupabase, appId, {
          status: "failed",
          attempts: MAX_ATTEMPTS,
          last_error: `${detail}. Check whether the Steam listing is accessible.`,
        });

        results.push({
          appId,
          title: fallbackTitle,
          status: "failed",
          message: `${detail}. This response was not treated as a temporary server failure.`,
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
        const detail = `Steam returned invalid JSON: ${getErrorMessage(
          error
        )}`;

        console.error(
          `Steam appdetails failure for App ID ${appId}: ${detail}`
        );

        return deferAndStop(
          adminSupabase,
          queueItems,
          index,
          results,
          `${detail}. Remaining listings were returned to the queue without consuming attempts.`,
          TEMPORARY_FAILURE_COOLDOWN_SECONDS
        );
      }

      const result = payload?.[appId];

      if (result && result.success === false) {
        const message =
          `Steam returned success=false for App ID ${appId}. ` +
          "App details are unavailable from Steam's endpoint. " +
          "The item has been stopped from automatic retries and can be reviewed later.";

        console.warn(`Steam listing unavailable: ${message}`);

        await updateQueueItem(adminSupabase, appId, {
          status: "failed",
          attempts: MAX_ATTEMPTS,
          last_error: message,
        });

        results.push({
          appId,
          title: fallbackTitle,
          status: "failed",
          message:
            "Steam did not provide app details. Automatic retries for this item have stopped; the rest of the batch will continue.",
        });

        continue;
      }

      if (!result || result.success !== true || !result.data) {
        const detail = !result
          ? `Steam's HTTP 200 response did not contain an entry for App ID ${appId}. Response keys: ${
              Object.keys(payload ?? {}).slice(0, 10).join(", ") ||
              "none"
            }.`
          : `Steam returned success=${String(
              result.success
            )} or incomplete data for App ID ${appId}.`;

        console.error(`Steam appdetails unavailable: ${detail}`);

        return deferAndStop(
          adminSupabase,
          queueItems,
          index,
          results,
          `${detail} The remaining batch was returned to the queue without consuming attempts. Processing stopped to avoid unnecessary requests.`,
          TEMPORARY_FAILURE_COOLDOWN_SECONDS
        );
      }

      try {
        const game = result.data;

        if (game.type !== "game") {
          const { error: eligibilityError } = await adminSupabase
            .from("imported_games")
            .update({
              catalogue_eligible: false,
              catalogue_review_status: "excluded",
              catalogue_review_reason: `Steam classifies this listing as "${
                game.type ?? "unknown type"
              }", not a game.`,
            })
            .eq("steam_app_id", appId);

          if (eligibilityError) {
            throw new Error(
              `Could not update eligibility: ${eligibilityError.message}`
            );
          }

          await updateQueueItem(adminSupabase, appId, {
            status: "not_game",
            last_error: `Steam classifies this listing as "${
              game.type ?? "unknown type"
            }", not a game.`,
          });

          results.push({
            appId,
            title: game.name ?? fallbackTitle,
            status: "not_game",
            message: `Skipped because Steam classifies this listing as "${
              game.type ?? "unknown type"
            }", not a game.`,
          });

          continue;
        }

        const title = game.name?.trim();

        if (!title) {
          const message = "Steam returned a game without a title.";

          await updateQueueItem(adminSupabase, appId, {
            status: "failed",
            attempts: MAX_ATTEMPTS,
            last_error: message,
          });

          results.push({
            appId,
            title: fallbackTitle,
            status: "failed",
            message,
          });

          continue;
        }

        const publishers = (game.publishers ?? []).filter(Boolean);
        const developers = (game.developers ?? []).filter(Boolean);

        const genres = (game.genres ?? [])
          .map((genre) => genre.description)
          .filter(
            (value): value is string => Boolean(value)
          );

        const exclusionReason = getIndieExclusionReason(
          title,
          genres
        );

        const reviewStatus =
          getCatalogueReviewStatus(exclusionReason);

        const now = new Date().toISOString();

        const price = game.is_free
          ? "Free"
          : game.price_overview?.final_formatted ?? null;

        const { data: existing, error: existingError } =
          await adminSupabase
            .from("imported_games")
            .select(
              "developer_name, publisher_name, genre, description, image_url, price, release_date"
            )
            .eq("steam_app_id", appId)
            .maybeSingle();

        if (existingError) {
          throw new Error(
            `Could not check the existing catalogue record: ${existingError.message}`
          );
        }

        const existingGame = existing as ExistingGame | null;

        const { error: saveError } = await adminSupabase
          .from("imported_games")
          .upsert(
            {
              steam_app_id: appId,
              title,
              developer_name:
                developers.join(", ") ||
                existingGame?.developer_name ||
                null,
              publisher_name:
                publishers.join(", ") ||
                existingGame?.publisher_name ||
                null,
              genre:
                genres.join(", ") ||
                existingGame?.genre ||
                null,
              description:
                game.short_description ||
                existingGame?.description ||
                null,
              steam_url: `https://store.steampowered.com/app/${appId}/`,
              image_url:
                game.header_image ||
                existingGame?.image_url ||
                null,
              price:
                price ??
                existingGame?.price ??
                null,
              release_date:
                parseReleaseDate(game.release_date?.date) ??
                existingGame?.release_date ??
                null,
              last_synced_at: now,
              metadata_backfill_status: "complete",
              catalogue_eligible:
                reviewStatus === "eligible",
              catalogue_review_status: reviewStatus,
              catalogue_review_reason: exclusionReason,
            },
            { onConflict: "steam_app_id" }
          );

        if (saveError) {
          throw new Error(
            `The game could not be saved to the catalogue: ${saveError.message}`
          );
        }

        await updateQueueItem(adminSupabase, appId, {
          status: "processed",
          last_error: exclusionReason,
        });

        results.push(
          reviewStatus === "eligible"
            ? {
                appId,
                title,
                status: "imported",
                message: `${title} passed preliminary indie screening. This is not a full verification.`,
              }
            : {
                appId,
                title,
                status: "excluded",
                message:
                  exclusionReason ??
                  "Listing requires review.",
              }
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown import error.";

        const { error: updateError } = await adminSupabase
          .from("steam_catalogue_queue")
          .update({
            status: "failed",
            last_error: errorMessage.slice(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq("steam_app_id", appId);

        if (updateError) {
          console.error(
            `Could not record failure for ${appId}:`,
            updateError.message
          );
        }

        results.push({
          appId,
          title: fallbackTitle,
          status: "failed",
          message: errorMessage,
        });
      }
    }

    const counts = getCounts(results);

    return NextResponse.json({
      success: true,
      ...counts,
      results,
      message:
        `Processed ${counts.processed} listings: ` +
        `${counts.imported} passed preliminary indie screening, ` +
        `${counts.notGames} non-game listings skipped, ` +
        `${counts.excluded} excluded or held back by the eligibility filter, ` +
        `${counts.failed} failed.`,
    });
  } catch (error) {
    console.error("Steam queue processing error:", error);

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while processing the queue.",
        details:
          error instanceof Error
            ? error.message
            : "Unknown server error.",
      },
      { status: 500 }
    );
  }
}