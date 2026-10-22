import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase-server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const BATCH_SIZE = 20;
const REQUEST_DELAY_MS = 1000;
const MAX_ATTEMPTS = 3;
const BATCH_TIME_BUDGET_MS = 45000;
const REQUEST_TIMEOUT_MS = 8000;
const LOCK_NAME = "steam-metadata-backfill";
const LOCK_LEASE_SECONDS = 90;

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

type CatalogueGame = {
  id: string;
  steam_app_id: string;
  title: string | null;
  developer_name: string | null;
  publisher_name: string | null;
  genre: string | null;
  description: string | null;
  steam_url: string | null;
  image_url: string | null;
  price: string | null;
  release_date: string | null;
  catalogue_eligible: boolean;
  metadata_backfill_attempts: number;
};

type ResultItem = {
  appId: string;
  title: string;
  status: "updated" | "excluded" | "not_game" | "failed";
  message: string;
};

// These are strong signals of established, large-scale franchises.
// A publisher or developer name alone is not grounds for exclusion.
const MAJOR_FRANCHISE_PATTERNS = [
  /\bcyberpunk\s*2077\b/i,
  /\bcall of duty\b/i,
  /\bgrand theft auto\b/i,
  /\bgta\s*(v|5)\b/i,
  /\bred dead redemption\b/i,
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
  /\bteam fortress\b/i,
  /\bhalf-life\b/i,
  /\bcounter-strike\b/i,
  /\bportal\s*[12]?\b/i,
  /\bleft 4 dead\b/i,
  /\bdota 2\b/i,
  /\bdeus ex\b/i,
  /\bbioshock\b/i,
  /\bborderlands\b/i,
  /\bx-com\b/i,
  /\bcivilization\s*(v|vi|5|6|7)\b/i,
  /\bsid meier'?s civilization\b/i,
  /\bcommandos\b/i,
  /\btotal war\b/i,
  /\bwarhammer 40,?000\b/i,
  /\bage of empires\b/i,
  /\bstarcraft\b/i,
  /\btekken\b/i,
  /\bstreet fighter\b/i,
  /\bdevil may cry\b/i,
  /\bmetal gear solid\b/i,
  /\bsonic the hedgehog\b/i,
  /\byakuza\b/i,
  /\blike a dragon\b/i,
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

const GAME_COLUMNS =
  "id, steam_app_id, title, developer_name, publisher_name, genre, description, steam_url, image_url, price, release_date, catalogue_eligible, metadata_backfill_attempts";

function normalizedName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getIndieExclusionReason(
  title: string,
  genres: string[]
): string | null {
  // Exclude known major franchise titles, regardless of publisher.
  if (MAJOR_FRANCHISE_PATTERNS.some((pattern) => pattern.test(title))) {
    return "Held back by the established major-franchise screening rule.";
  }

  const normalizedGenres = genres.map(normalizedName);

  // Exclude only listings whose categories are exclusively non-game
  // software categories. A mixed listing is not rejected by this rule.
  if (
    normalizedGenres.length > 0 &&
    normalizedGenres.every((genre) => NON_GAME_GENRES.has(genre))
  ) {
    return "Excluded because the Steam listing only has non-game software categories.";
  }

  // Do not exclude a game solely because its developer or publisher
  // is a known company. Established publishers can release indie games,
  // and older games can still be relevant to discovery.
  //
  // The Indie tag is a prioritisation signal, not an eligibility
  // requirement. Passing these checks is preliminary screening only.
  return null;
}

function parseReleaseDate(value?: string): string | null {
  if (!value) return null;

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString().slice(0, 10);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function updateTracking(
  adminSupabase: any,
  id: string,
  values: Record<string, unknown>
) {
  const { error } = await adminSupabase
    .from("imported_games")
    .update(values)
    .eq("id", id);

  if (error) {
    throw new Error(`Tracking update failed: ${error.message}`);
  }
}

async function countPending(adminSupabase: any) {
  const { count, error } = await adminSupabase
    .from("imported_games")
    .select("id", { count: "exact", head: true })
    .eq("metadata_backfill_status", "pending")
    .lt("metadata_backfill_attempts", MAX_ATTEMPTS)
    .or(
      "genre.is.null,developer_name.is.null,publisher_name.is.null,image_url.is.null,description.is.null"
    );

  if (error) {
    throw new Error(`Could not count remaining records: ${error.message}`);
  }

  return count ?? 0;
}

export async function POST() {
  const batchStartedAt = Date.now();
  let adminSupabase: any = null;
  let lockToken: string | null = null;
  let lockAcquired = false;

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be logged in." },
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase server configuration is missing." },
        { status: 500 }
      );
    }

    adminSupabase = createSupabaseClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    lockToken = randomUUID();

    const { data: acquired, error: lockError } =
      await adminSupabase.rpc("acquire_catalogue_backfill_lock", {
        p_lock_name: LOCK_NAME,
        p_lock_token: lockToken,
        p_lease_seconds: LOCK_LEASE_SECONDS,
      });

    if (lockError) {
      throw new Error(`Could not acquire backfill lock: ${lockError.message}`);
    }

    if (acquired !== true) {
      return NextResponse.json(
        {
          success: false,
          locked: true,
          message:
            "A metadata backfill is already running. Wait for it to finish before starting another.",
        },
        { status: 409 }
      );
    }

    lockAcquired = true;

    const { data: stale, error: staleError } = await adminSupabase
      .from("imported_games")
      .update({ metadata_backfill_status: "pending" })
      .eq("metadata_backfill_status", "processing")
      .select("id");

    if (staleError) {
      throw new Error(
        `Could not recover interrupted records: ${staleError.message}`
      );
    }

    const selectedGames: CatalogueGame[] = [];
    const selectedIds = new Set<string>();

    // Priority 1: Indie-tagged records with missing metadata.
    const { data: indieGames, error: indieError } = await adminSupabase
      .from("imported_games")
      .select(GAME_COLUMNS)
      .eq("metadata_backfill_status", "pending")
      .lt("metadata_backfill_attempts", MAX_ATTEMPTS)
      .ilike("genre", "%Indie%")
      .or(
        "genre.is.null,developer_name.is.null,publisher_name.is.null,image_url.is.null,description.is.null"
      )
      .order("id", { ascending: true })
      .limit(BATCH_SIZE);

    if (indieError) {
      throw new Error(`Could not select Indie records: ${indieError.message}`);
    }

    for (const game of (indieGames ?? []) as CatalogueGame[]) {
      if (selectedGames.length >= BATCH_SIZE) break;
      selectedGames.push(game);
      selectedIds.add(game.id);
    }

    // Priority 2: records already displayable but missing other metadata.
    if (selectedGames.length < BATCH_SIZE) {
      const { data: displayableGames, error: displayableError } =
        await adminSupabase
          .from("imported_games")
          .select(GAME_COLUMNS)
          .eq("metadata_backfill_status", "pending")
          .lt("metadata_backfill_attempts", MAX_ATTEMPTS)
          .not("title", "is", null)
          .not("developer_name", "is", null)
          .not("genre", "is", null)
          .not("image_url", "is", null)
          .or("publisher_name.is.null,description.is.null")
          .order("id", { ascending: true })
          .limit(BATCH_SIZE * 5);

      if (displayableError) {
        throw new Error(
          `Could not select displayable records: ${displayableError.message}`
        );
      }

      for (const game of (displayableGames ?? []) as CatalogueGame[]) {
        if (selectedGames.length >= BATCH_SIZE) break;

        if (!selectedIds.has(game.id)) {
          selectedGames.push(game);
          selectedIds.add(game.id);
        }
      }
    }

    // Priority 3: general queue.
    if (selectedGames.length < BATCH_SIZE) {
      const { data: otherGames, error: generalError } = await adminSupabase
        .from("imported_games")
        .select(GAME_COLUMNS)
        .eq("metadata_backfill_status", "pending")
        .lt("metadata_backfill_attempts", MAX_ATTEMPTS)
        .or(
          "genre.is.null,developer_name.is.null,publisher_name.is.null,image_url.is.null,description.is.null"
        )
        .order("id", { ascending: true })
        .limit(BATCH_SIZE * 5);

      if (generalError) {
        throw new Error(
          `Could not select general pending records: ${generalError.message}`
        );
      }

      for (const game of (otherGames ?? []) as CatalogueGame[]) {
        if (selectedGames.length >= BATCH_SIZE) break;

        if (!selectedIds.has(game.id)) {
          selectedGames.push(game);
          selectedIds.add(game.id);
        }
      }
    }

    const results: ResultItem[] = [];

    for (let index = 0; index < selectedGames.length; index++) {
      if (Date.now() - batchStartedAt >= BATCH_TIME_BUDGET_MS) {
        break;
      }

      const item = selectedGames[index];
      const appId = String(item.steam_app_id);
      const fallbackTitle = item.title || appId;
      const attempts = Number(item.metadata_backfill_attempts ?? 0) + 1;

      await updateTracking(adminSupabase, item.id, {
        metadata_backfill_status: "processing",
        metadata_backfill_attempts: attempts,
        metadata_backfill_error: null,
      });

      if (index > 0) {
        await wait(REQUEST_DELAY_MS);
      }

      try {
        const params = new URLSearchParams({
          appids: appId,
          l: "en",
        });

        const response = await fetch(
          `https://store.steampowered.com/api/appdetails?${params.toString()}`,
          {
            cache: "no-store",
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          }
        );

        if (!response.ok) {
          throw new Error(`Steam returned HTTP ${response.status}.`);
        }

        const payload = (await response.json()) as Record<
          string,
          SteamAppDetails
        >;
        const result = payload[appId];

        if (!result?.success || !result.data) {
          throw new Error("Steam details are currently unavailable.");
        }

        const game = result.data;

        if (game.type !== "game") {
          const { error: updateError } = await adminSupabase
            .from("imported_games")
            .update({
              catalogue_eligible: false,
              metadata_backfill_status: "complete",
              metadata_backfill_error:
                "Steam does not classify this listing as a game.",
              last_synced_at: new Date().toISOString(),
            })
            .eq("id", item.id);

          if (updateError) {
            throw new Error(
              `Could not update non-game record: ${updateError.message}`
            );
          }

          results.push({
            appId,
            title: fallbackTitle,
            status: "not_game",
            message: "Marked ineligible because this is not a Steam game.",
          });

          continue;
        }

        const title = game.name?.trim();

        if (!title) {
          throw new Error("Steam returned a game without a title.");
        }

        const developers = (game.developers ?? []).filter(Boolean);
        const publishers = (game.publishers ?? []).filter(Boolean);
        const genres = (game.genres ?? [])
          .map((entry) => entry.description)
          .filter((value): value is string => Boolean(value));

        const exclusionReason = getIndieExclusionReason(title, genres);

        const price = game.is_free
          ? "Free"
          : game.price_overview?.final_formatted ?? item.price;

        const { error: updateError } = await adminSupabase
          .from("imported_games")
          .update({
            title,
            developer_name: developers.join(", ") || item.developer_name,
            publisher_name: publishers.join(", ") || item.publisher_name,
            genre: genres.join(", ") || item.genre,
            description: game.short_description || item.description,
            steam_url:
              item.steam_url ||
              `https://store.steampowered.com/app/${appId}/`,
            image_url: game.header_image || item.image_url,
            price,
            release_date:
              parseReleaseDate(game.release_date?.date) ??
              item.release_date,
            last_synced_at: new Date().toISOString(),
            catalogue_eligible: !exclusionReason,
            metadata_backfill_status: "complete",
            metadata_backfill_error: exclusionReason,
          })
          .eq("id", item.id);

        if (updateError) {
          throw new Error(
            `Could not update catalogue record: ${updateError.message}`
          );
        }

        if (exclusionReason) {
          results.push({
            appId,
            title,
            status: "excluded",
            message: exclusionReason,
          });
        } else {
          results.push({
            appId,
            title,
            status: "updated",
            message:
              "Metadata updated. Passed preliminary screening only; this is not Playtested verification.",
          });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error.";
        const exhausted = attempts >= MAX_ATTEMPTS;

        const { error: trackingError } = await adminSupabase
          .from("imported_games")
          .update({
            metadata_backfill_status: exhausted ? "failed" : "pending",
            metadata_backfill_error: message.slice(0, 500),
          })
          .eq("id", item.id);

        if (trackingError) {
          console.error(
            `Could not record backfill failure for ${appId}:`,
            trackingError.message
          );
        }

        results.push({
          appId,
          title: fallbackTitle,
          status: "failed",
          message: `${message}${exhausted ? " Maximum attempts reached." : " It can be retried."}`,
        });

        if (/HTTP (429|5\d\d)/.test(message)) {
          break;
        }
      }
    }

    const pendingCount = await countPending(adminSupabase);

    const { count: failedCount, error: failedCountError } =
      await adminSupabase
        .from("imported_games")
        .select("id", { count: "exact", head: true })
        .eq("metadata_backfill_status", "failed");

    if (failedCountError) {
      throw new Error(
        `Could not count failed records: ${failedCountError.message}`
      );
    }

    const elapsedSeconds = Math.round((Date.now() - batchStartedAt) / 1000);

    return NextResponse.json({
      success: true,
      processed: results.length,
      updated: results.filter((result) => result.status === "updated").length,
      excluded: results.filter((result) => result.status === "excluded").length,
      notGames: results.filter((result) => result.status === "not_game").length,
      failed: results.filter((result) => result.status === "failed").length,
      pending: pendingCount,
      permanentlyFailed: failedCount ?? 0,
      recoveredInterruptedRecords: stale?.length ?? 0,
      elapsedSeconds,
      results,
      message: `Processed ${results.length} records in ${elapsedSeconds}s. ${pendingCount} remain pending and ${failedCount ?? 0} have reached the retry limit.`,
    });
  } catch (error) {
    console.error("Steam metadata backfill error:", error);

    return NextResponse.json(
      {
        error: "An unexpected error occurred during metadata backfill.",
        details:
          error instanceof Error ? error.message : "Unknown server error.",
      },
      { status: 500 }
    );
  } finally {
    if (lockAcquired && adminSupabase && lockToken) {
      const { error: releaseError } = await adminSupabase.rpc(
        "release_catalogue_backfill_lock",
        {
          p_lock_name: LOCK_NAME,
          p_lock_token: lockToken,
        }
      );

      if (releaseError) {
        console.error(
          "Could not release Steam backfill lock:",
          releaseError.message
        );
      }
    }
  }
}