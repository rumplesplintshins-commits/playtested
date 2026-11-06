import { createServer } from "node:http";

const steamId = "912345";
const steamGame = {
  source_type: "steam",
  game_id: "f4200000-0000-4000-8000-000000000001",
  steam_app_id: steamId,
  title: "Mock Adventure",
  developer_name: "Regression Studio",
  genre: "Puzzle",
  description: "An isolated mock listing used only for browser regression tests.",
  image_url: "https://images.example.test/mock-adventure.jpg",
  game_link: `https://store.steampowered.com/app/${steamId}/`,
  ai_type: "AI use unknown",
  verification_status: "Not yet verified",
  quality_score: 0,
  submitted_at: "2026-01-01T00:00:00Z",
  is_nsfw: false,
  has_playtested_profile: false,
};
const approvedGame = {
  ...steamGame,
  source_type: "approved",
  game_id: "f4200000-0000-4000-8000-000000000002",
  steam_app_id: "912346",
  title: "Mock Approved Game",
  genre: "Adventure",
  has_playtested_profile: true,
};
const visibleCatalogue = [steamGame, approvedGame];
const importedRows = [
  {
    id: steamGame.game_id,
    steam_app_id: steamId,
    title: steamGame.title,
    developer_name: steamGame.developer_name,
    genre: steamGame.genre,
    description: steamGame.description,
    steam_url: steamGame.game_link,
    image_url: steamGame.image_url,
    catalogue_eligible: true,
    metadata_backfill_status: "complete",
  },
  { ...steamGame, id: "f4200000-0000-4000-8000-000000000003", steam_app_id: "912346", title: "Duplicate Import", catalogue_eligible: true, metadata_backfill_status: "complete" },
  { ...steamGame, id: "f4200000-0000-4000-8000-000000000004", steam_app_id: "912347", title: "Incomplete Import", catalogue_eligible: true, metadata_backfill_status: "pending" },
  { ...steamGame, id: "f4200000-0000-4000-8000-000000000005", steam_app_id: "912348", title: "Hidden Fixture", catalogue_eligible: true, metadata_backfill_status: "complete", hidden: true },
];
const importedGame = {
  id: steamGame.game_id,
  steam_app_id: steamId,
  title: steamGame.title,
  developer_name: steamGame.developer_name,
  genre: steamGame.genre,
  description: steamGame.description,
  steam_url: steamGame.game_link,
  image_url: steamGame.image_url,
};

export async function startMockPublicSupabase(port = 32829) {
  let catalogueCalls = 0;
  const server = createServer(async (request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "apikey, authorization, content-type, x-client-info, accept, accept-profile, content-profile, range");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }

    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    const send = (status, data) => {
      response.writeHead(status, { "content-type": "application/json" });
      response.end(JSON.stringify(data));
    };

    if (url.pathname === "/rest/v1/rpc/get_public_catalogue" && request.method === "POST") {
      catalogueCalls += 1;
      let body = "";
      for await (const chunk of request) body += chunk;
      const args = JSON.parse(body || "{}");
      const search = String(args.p_search || "").toLowerCase();
      const rows = visibleCatalogue
        .filter(row => !search || `${row.title} ${row.developer_name} ${row.genre}`.toLowerCase().includes(search))
        .filter(row => args.p_include_nsfw === true || !row.is_nsfw);
      const pageSize = Number(args.p_page_size || 12);
      const page = Number(args.p_page || 1);
      const selected = rows.slice((page - 1) * pageSize, page * pageSize)
        .map(row => ({ ...row, total_count: rows.length }));
      send(200, selected);
      return;
    }

    if (url.pathname.startsWith("/rest/v1/rpc/")) {
      send(200, []);
      return;
    }

    if (url.pathname === "/rest/v1/imported_games") {
      const steamIdFilter = url.searchParams.get("steam_app_id");
      const visibleRows = importedRows.filter(row => !row.hidden);
      const rows = steamIdFilter
        ? visibleRows.filter(row => String(row.steam_app_id) === steamIdFilter.slice(3) && row.catalogue_eligible && row.metadata_backfill_status === "complete")
        : visibleRows.filter(row =>
          url.searchParams.get("catalogue_eligible") === "eq.true" &&
          url.searchParams.get("metadata_backfill_status") === "eq.complete" &&
          row.catalogue_eligible &&
          row.metadata_backfill_status === "complete" &&
          row.title &&
          row.developer_name &&
          row.genre &&
          row.image_url
        );
      const match = request.headers.range?.match(/(\d+)-(\d+)/);
      const selected = match ? rows.slice(Number(match[1]), Number(match[2]) + 1) : rows;
      const responseRows = steamIdFilter ? selected.map(() => importedGame) : selected;
      send(200, request.headers.accept?.includes("vnd.pgrst.object+json") ? responseRows[0] ?? null : responseRows);
      return;
    }

    if (url.pathname === "/rest/v1/approved_games") {
      const match = request.headers.range?.match(/(\d+)-(\d+)/);
      const rows = [approvedGame].map(row => ({ id: row.game_id, title: row.title, steam_app_id: row.steam_app_id }));
      send(200, match ? rows.slice(Number(match[1]), Number(match[2]) + 1) : rows);
      return;
    }

    send(200, []);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  return {
    close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
    getCatalogueCalls: () => catalogueCalls,
    resetCatalogueCalls: () => { catalogueCalls = 0; },
    steamId,
  };
}
