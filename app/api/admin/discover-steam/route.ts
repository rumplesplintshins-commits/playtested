import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const PAGE_SIZE = 50;

type SteamSearchApp = {
  appid: string;
  name: string;
};

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function extractHtmlApps(html: string): SteamSearchApp[] {
  const apps = new Map<string, SteamSearchApp>();

  const cardPattern =
    /<a\b(?=[^>]*class="[^"]*\bsearch_result_row\b)[^>]*>[\s\S]*?<\/a>/gi;

  for (const match of html.matchAll(cardPattern)) {
    const card = match[0];
    const openingTag = card.match(/^<a\b[^>]*>/i)?.[0] ?? "";
    const idMatch = openingTag.match(/\bdata-ds-appid="(\d+)"/i);

    const titleMatch = card.match(
      /<span\b[^>]*class="[^"]*\btitle\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i
    );

    if (!idMatch || !titleMatch) continue;

    const appid = idMatch[1];
    const name = decodeHtml(titleMatch[1].replace(/<[^>]*>/g, ""));

    if (name) {
      apps.set(appid, { appid, name });
    }
  }

  return [...apps.values()];
}

function extractItemApps(items: unknown[]): SteamSearchApp[] {
  const apps = new Map<string, SteamSearchApp>();

  for (const item of items) {
    if (!item || typeof item !== "object") continue;

    const record = item as Record<string, unknown>;
    const name =
      typeof record.name === "string" ? record.name.trim() : "";
    const logo =
      typeof record.logo === "string" ? record.logo : "";

    const idMatch = logo.match(/\/steam\/apps\/(\d+)\//);

    if (!name || !idMatch) continue;

    apps.set(idMatch[1], {
      appid: idMatch[1],
      name,
    });
  }

  return [...apps.values()];
}

export async function POST() {
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

    const { data: progress, error: progressError } =
      await adminSupabase
        .from("steam_indie_discovery_progress")
        .select("start_offset, completed")
        .eq("id", 1)
        .single();

    if (progressError || !progress) {
      return NextResponse.json(
        {
          error: "Could not read indie discovery progress.",
          details: progressError?.message,
        },
        { status: 500 }
      );
    }

    if (progress.completed) {
      return NextResponse.json({
        success: true,
        complete: true,
        discovered: 0,
        message:
          "Indie discovery has already reached the end of its results.",
      });
    }

    const startOffset = Number(progress.start_offset);

    if (!Number.isSafeInteger(startOffset) || startOffset < 0) {
      return NextResponse.json(
        { error: "The saved indie discovery offset is invalid." },
        { status: 500 }
      );
    }

    const params = new URLSearchParams({
      json: "1",
      start: String(startOffset),
      count: String(PAGE_SIZE),
      category1: "998",
      tags: "492",
      supportedlang: "english",
      cc: "gb",
    });

    const steamResponse = await fetch(
      `https://store.steampowered.com/search/results/?${params.toString()}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
        headers: {
          "User-Agent": "Playtested indie catalogue discovery",
        },
      }
    );

    if (!steamResponse.ok) {
      return NextResponse.json(
        {
          error: `Steam Store search failed with HTTP ${steamResponse.status}.`,
          retryable:
            steamResponse.status === 429 ||
            steamResponse.status >= 500,
          startOffset,
        },
        {
          status:
            steamResponse.status === 429 ||
            steamResponse.status >= 500
              ? 503
              : 502,
        }
      );
    }

    const responseText = await steamResponse.text();
    let payload: unknown;

    try {
      payload = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        {
          error: "Steam returned a non-JSON response.",
          responsePreview: responseText.slice(0, 1000),
        },
        { status: 502 }
      );
    }

    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { error: "Steam returned an unexpected response." },
        { status: 502 }
      );
    }

    const result = payload as Record<string, unknown>;
    let apps: SteamSearchApp[];
    let returnedCount: number;

    if (Array.isArray(result.items)) {
      apps = extractItemApps(result.items);
      returnedCount = result.items.length;
    } else if (typeof result.results_html === "string") {
      apps = extractHtmlApps(result.results_html);
      returnedCount = apps.length;
    } else {
      return NextResponse.json(
        {
          error: "Steam returned an unsupported response format.",
          responseKeys: Object.keys(result),
          responsePreview: JSON.stringify(result).slice(0, 2000),
        },
        { status: 502 }
      );
    }

    if (returnedCount > 0 && apps.length === 0) {
      return NextResponse.json(
        {
          error:
            "Steam returned listings, but Playtested could not extract their App IDs. Progress was not advanced.",
          startOffset,
          returnedCount,
          responsePreview: JSON.stringify(result).slice(0, 2000),
        },
        { status: 502 }
      );
    }

    if (apps.length > 0) {
      const queueRows = apps.map((app) => ({
        steam_app_id: app.appid,
        app_name: app.name,
      }));

      const { error: queueError } = await adminSupabase
        .from("steam_catalogue_queue")
        .upsert(queueRows, {
          onConflict: "steam_app_id",
          ignoreDuplicates: true,
        });

      if (queueError) {
        return NextResponse.json(
          {
            error: "Could not save listings to the processing queue.",
            details: queueError.message,
          },
          { status: 500 }
        );
      }
    }

    // Discovery only records candidates in the queue.
    // It does not create public catalogue records.
    // Indie eligibility must be checked before a listing
    // is allowed into imported_games.

    const now = new Date().toISOString();
    const isFinished = returnedCount < PAGE_SIZE;
    const nextOffset = startOffset + returnedCount;

    const { error: updateError } = await adminSupabase
      .from("steam_indie_discovery_progress")
      .update({
        start_offset: nextOffset,
        completed: isFinished,
        updated_at: now,
      })
      .eq("id", 1);

    if (updateError) {
      return NextResponse.json(
        {
          error:
            "Listings were queued, but discovery progress could not be updated.",
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      complete: isFinished,
      discovered: apps.length,
      startOffset,
      nextOffset,
      returnedCount,
      message: isFinished
        ? `Reached the end of the available results. Queued ${apps.length} candidates in this batch.`
        : `Batch complete: queued ${apps.length} candidates. Next requested offset: ${nextOffset}.`,
    });
  } catch (error) {
    console.error("Indie Steam discovery error:", error);

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred during indie Steam discovery.",
        details:
          error instanceof Error
            ? error.message
            : "Unknown server error.",
      },
      { status: 500 }
    );
  }
}