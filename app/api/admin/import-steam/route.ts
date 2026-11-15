
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    // Verify the authenticated user.
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

    // Verify admin access.
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

    const body = await request.json();

    // Accept either the existing single App ID or a list of IDs.
    const rawIds = Array.isArray(body.appIds)
      ? body.appIds
      : [body.appId];

const appIds: string[] = Array.from(
  new Set<string>(
    rawIds
      .map((id: unknown) => String(id ?? "").trim())
      .filter((id: string) => /^\d{1,12}$/.test(id))
  )
);

    if (appIds.length === 0) {
      return NextResponse.json(
        { error: "Enter at least one valid numeric Steam App ID." },
        { status: 400 }
      );
    }

    if (appIds.length > 20) {
      return NextResponse.json(
        { error: "Import a maximum of 20 games at a time." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration is missing the import credentials." },
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

    const results: {
      appId: string;
      title?: string;
      success: boolean;
      message: string;
    }[] = [];

    // Process IDs sequentially to avoid sending too many requests to Steam.
    for (const appId of appIds) {
      try {
        const steamResponse = await fetch(
          `https://store.steampowered.com/api/appdetails?appids=${appId}&l=en`,
          { cache: "no-store" }
        );

        if (!steamResponse.ok) {
          results.push({
            appId,
            success: false,
            message: "Steam could not be reached.",
          });
          continue;
        }

        const steamResult = await steamResponse.json();
        const app = steamResult[appId];

        if (!app?.success || !app?.data) {
          results.push({
            appId,
            success: false,
            message: "Steam did not return a valid game for this ID.",
          });
          continue;
        }

        const game = app.data;

        if (game.type !== "game") {
          results.push({
            appId,
            success: false,
            message: "This Steam App ID is not listed as a game.",
          });
          continue;
        }

        const genres = Array.isArray(game.genres)
          ? game.genres
              .map((item: { description?: string }) => item.description)
              .filter(Boolean)
          : [];

        const developers = Array.isArray(game.developers)
          ? game.developers.filter(Boolean)
          : [];

        const releaseDate = game.release_date?.date
          ? parseSteamReleaseDate(game.release_date.date)
          : null;

        const price = game.is_free
          ? "Free"
          : game.price_overview?.final_formatted ?? null;

        const { error: saveError } = await adminSupabase
          .from("imported_games")
          .upsert(
            {
              steam_app_id: appId,
              title: game.name,
              developer_name: developers.join(", ") || null,
              genre: genres.join(", ") || null,
              description: game.short_description || null,
              steam_url: `https://store.steampowered.com/app/${appId}/`,
              image_url: game.header_image || null,
              price,
              release_date: releaseDate,
              last_synced_at: new Date().toISOString(),
            },
            { onConflict: "steam_app_id" }
          );

        if (saveError) {
          console.error("Steam import database error:", saveError.message);
          results.push({
            appId,
            title: game.name,
            success: false,
            message: "Found on Steam, but could not save to the database.",
          });
          continue;
        }

        results.push({
          appId,
          title: game.name,
          success: true,
          message: `${game.name} imported successfully.`,
        });
      } catch {
        results.push({
          appId,
          success: false,
          message: "An error occurred while importing this game.",
        });
      }
    }

    const importedCount = results.filter((item) => item.success).length;
    const failedCount = results.length - importedCount;

    return NextResponse.json({
      success: importedCount > 0,
      importedCount,
      failedCount,
      results,
      message: `${importedCount} game(s) imported; ${failedCount} failed.`,
    });
  } catch (error) {
    console.error("Steam import error:", error);
    return NextResponse.json(
      { error: "Something went wrong while importing the games." },
      { status: 500 }
    );
  }
}

function parseSteamReleaseDate(value: string): string | null {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}
