import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

async function checkAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      ),
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      error: NextResponse.json(
        { error: "Server configuration is missing." },
        { status: 500 }
      ),
    };
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

  return { adminSupabase };
}

function validId(id: unknown): id is string {
  return (
    typeof id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id
    )
  );
}

export async function GET(request: Request) {
  try {
    const result = await checkAdmin();

    if ("error" in result) {
      return result.error;
    }

    const url = new URL(request.url);
    const search = (url.searchParams.get("search") ?? "").trim();
    const status = url.searchParams.get("status") ?? "all";
    const requestedPage = Number(url.searchParams.get("page") ?? "1");
    const requestedPageSize = Number(
      url.searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE)
    );

    const page =
      Number.isInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1;

    const pageSize =
      Number.isInteger(requestedPageSize) && requestedPageSize > 0
        ? Math.min(requestedPageSize, MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE;

    if (!["all", "eligible", "excluded", "pending", "complete"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid catalogue filter." },
        { status: 400 }
      );
    }

    let query = result.adminSupabase
      .from("imported_games")
      .select(
        "id, steam_app_id, title, developer_name, publisher_name, genre, description, steam_url, image_url, price, release_date, imported_at, last_synced_at, catalogue_eligible, metadata_backfill_status, metadata_backfill_error",
        { count: "exact" }
      );

    if (search) {
      const escapedSearch = search.replace(/[,%()]/g, " ");
      query = query.or(
        `title.ilike.%${escapedSearch}%,steam_app_id.ilike.%${escapedSearch}%,developer_name.ilike.%${escapedSearch}%`
      );
    }

    if (status === "eligible") {
      query = query.eq("catalogue_eligible", true);
    } else if (status === "excluded") {
      query = query.eq("catalogue_eligible", false);
    } else if (status === "pending") {
      query = query.eq("metadata_backfill_status", "pending");
    } else if (status === "complete") {
      query = query.eq("metadata_backfill_status", "complete");
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order("title", { ascending: true })
      .range(from, to);

    if (error) {
      console.error("Could not load imported games:", error.message);

      return NextResponse.json(
        { error: "Could not load imported games." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      games: data ?? [],
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    });
  } catch (error) {
    console.error("Imported games request failed:", error);

    return NextResponse.json(
      { error: "Something went wrong while loading imported games." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const result = await checkAdmin();

    if ("error" in result) {
      return result.error;
    }

    const body = await request.json().catch(() => null);
    const id = body?.id;
    const eligible = body?.catalogue_eligible;

    if (!validId(id)) {
      return NextResponse.json(
        { error: "A valid imported listing ID is required." },
        { status: 400 }
      );
    }

    if (typeof eligible !== "boolean") {
      return NextResponse.json(
        { error: "catalogue_eligible must be true or false." },
        { status: 400 }
      );
    }

    const { data, error } = await result.adminSupabase
      .from("imported_games")
      .update({ catalogue_eligible: eligible })
      .eq("id", id)
      .select("id, title, catalogue_eligible")
      .maybeSingle();

    if (error) {
      console.error("Could not update catalogue eligibility:", error.message);

      return NextResponse.json(
        { error: "Could not update the listing's catalogue eligibility." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "The imported listing was not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      game: data,
      message: eligible
        ? `${data.title} is eligible for catalogue display again.`
        : `${data.title} has been excluded from the public catalogue.`,
    });
  } catch (error) {
    console.error("Updating catalogue eligibility failed:", error);

    return NextResponse.json(
      { error: "Something went wrong while updating the listing." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const result = await checkAdmin();

    if ("error" in result) {
      return result.error;
    }

    const body = await request.json().catch(() => null);
    const id = body?.id;

    if (!validId(id)) {
      return NextResponse.json(
        { error: "A valid imported listing ID is required." },
        { status: 400 }
      );
    }

    const { data, error } = await result.adminSupabase
      .from("imported_games")
      .delete()
      .eq("id", id)
      .select("id, title")
      .maybeSingle();

    if (error) {
      console.error("Could not remove imported game:", error.message);

      return NextResponse.json(
        { error: "Could not permanently delete the imported listing." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "The imported listing was not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${data.title} was permanently removed from the imported catalogue.`,
    });
  } catch (error) {
    console.error("Imported game deletion failed:", error);

    return NextResponse.json(
      { error: "Something went wrong while removing the listing." },
      { status: 500 }
    );
  }
}
