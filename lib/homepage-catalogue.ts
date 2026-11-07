import "server-only";
import { cacheLife } from "next/cache";
import { publicProfileClient } from "./public-profile-links";
import type { HomepageCatalogueSeed, PublicCatalogueRow } from "./public-catalogue-types";

async function loadHomepageCatalogue(): Promise<Omit<HomepageCatalogueSeed, "error">> {
  "use cache";
  cacheLife("minutes");

  const { data, error } = await publicProfileClient().rpc("get_public_catalogue", {
    p_page: 1,
    p_page_size: 12,
    p_search: "",
    p_genre: "All genres",
    p_verification: "All verification statuses",
    p_ai_type: "All AI types",
    p_include_nsfw: false,
    p_sort: "Featured",
  });

  if (error) {
    throw new Error("Homepage public catalogue unavailable", { cause: error });
  }

  const rows = (data ?? []) as PublicCatalogueRow[];
  return {
    rows,
    total: rows.length ? Number(rows[0].total_count ?? 0) : 0,
  };
}

export async function homepageCatalogueSeed(): Promise<HomepageCatalogueSeed> {
  try {
    return { ...(await loadHomepageCatalogue()), error: false };
  } catch (error) {
    console.error("Could not load the server-rendered public catalogue:", error);
    return { rows: [], total: 0, error: true };
  }
}
