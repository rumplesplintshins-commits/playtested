"use client";

import {assessmentLabel} from "../../lib/review-labels";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { AI_CLASSIFICATIONS } from "@/lib/submission-completeness";
import {listingUpdates,listingNotice} from "@/lib/listing-updates";
import {publicIntentCounts,type IntentCounts} from "@/lib/intent-counts";
import IntentSummary from "./IntentSummary";
import {publicLinkedImportedIds,steamStoreUrl} from "@/lib/public-profile-links";

type VerificationStatus = "Verified" | "Assessed" | "Not yet verified";

type CatalogueGame = {
  key: string;
  slug: string;
  title: string;
  developer: string;
  genre: string;
  description: string;
  image: string;
  aiType: string;
  score: number;
  gameLink?: string;
  steamAppId?: string;
  isSubmission: boolean;
  isImportedSteam?: boolean;
  hasPlaytestedProfile?: boolean;
  isNsfw: boolean;
  verificationStatus: VerificationStatus | null;
  submittedAt?: string;
  communityReception: CommunityReception | null;
  recruiting: boolean;
  listingNotice: string;
  assessmentUnavailable: boolean;
  recommendationCounts?:IntentCounts;
};

type VerificationRow = {
  game_id: string;
  verification_status: VerificationStatus;
  quality_score: number | null;
};

type CatalogueRpcRow = {
  source_type: "approved" | "steam";
  game_id: string;
  steam_app_id: string | null;
  title: string;
  developer_name: string;
  genre: string;
  description: string;
  image_url: string;
  game_link: string;
  ai_type: string;
  verification_status: VerificationStatus;
  quality_score: number | string | null;
  submitted_at: string | null;
  is_nsfw: boolean;
  has_playtested_profile: boolean;
  total_count: number | string;
};

type ReceptionStatus =
  | "Early results"
  | "Excellent reception"
  | "Positive reception"
  | "Mixed reception"
  | "Poor reception";

type CommunityReceptionRow = {
  imported_game_id: string | null;
  approved_game_id: string | null;
  submission_id: string | null;
  game_title: string;
  accepted_test_count: number | string;
  rated_test_count: number | string;
  average_overall_score: number | string | null;
  average_gameplay_score: number | string | null;
  average_performance_score: number | string | null;
  recommend_positive_count: number | string;
  recommend_answered_count: number | string;
  recommend_positive_percent: number | string | null;
  continue_positive_count: number | string;
  continue_answered_count: number | string;
  continue_positive_percent: number | string | null;
  bug_report_count: number | string;
  average_hours_played: number | string | null;
  reception_status: ReceptionStatus;
};

type CommunityReception = {
  acceptedTestCount: number;
  ratedTestCount: number;
  averageOverallScore: number | null;
  recommendPositivePercent: number | null;
  continuePositivePercent: number | null;
  receptionStatus: ReceptionStatus;
};

const aiTypes = [
  "All AI types",
  ...AI_CLASSIFICATIONS,
  "AI use unknown",
];

const genres = [
  "All genres",
  "Action",
  "Adventure",
  "Casual",
  "RPG",
  "Strategy",
  "Simulation",
  "Racing",
  "Sports",
];

const sortOptions = [
  "Featured",
  "Recently added",
  "Highest rated",
  "Title A-Z",
];

const verificationOptions = [
  "All verification statuses",
  "Verified",
  "Assessed",
  "Not yet verified",
  "Steam listings",
];

const PAGE_SIZE = 12;

function normalizeSteamAppId(value: unknown): string {
  return String(value ?? "").trim();
}

function VerificationBadge({
  status,
}: {
  status: VerificationStatus | null;
}) {
  if (!status) {
    return null;
  }

  const styles: Record<VerificationStatus, string> = {
    Verified:
      "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    Assessed: "border-amber-400/40 bg-amber-400/10 text-amber-200",
    "Not yet verified": "border-white/20 bg-white/5 text-white/65",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      {assessmentLabel(status)}
    </span>
  );
}

function ReceptionBadge({ status }: { status: ReceptionStatus }) {
  const styles: Record<ReceptionStatus, string> = {
    "Early results": "border-amber-400/35 bg-amber-400/10 text-amber-200",
    "Excellent reception":
      "border-emerald-300/50 bg-emerald-300/15 text-emerald-200",
    "Positive reception":
      "border-emerald-400/35 bg-emerald-400/10 text-emerald-300",
    "Mixed reception": "border-sky-400/35 bg-sky-400/10 text-sky-200",
    "Poor reception": "border-red-400/35 bg-red-400/10 text-red-200",
  };

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function GenreBadge({ genre }: { genre: string }) {
  return (
    <span className="inline-flex w-fit rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300 sm:text-sm">
      {genre}
    </span>
  );
}

function GameCardContent({
  game,
  href,
  compact,
}: {
  game: CatalogueGame;
  href: string | undefined;
  compact: boolean;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const disclosure = AI_CLASSIFICATIONS.includes(game.aiType.trim()) ? game.aiType.trim() : "AI use unknown";
  const disclosureStyle = disclosure === "AI-generated" ? "border-violet-300/30 bg-violet-300/10 text-violet-200" : disclosure === "AI-assisted" ? "border-sky-300/30 bg-sky-300/10 text-sky-200" : "border-white/25 bg-white/5 text-slate-200";
  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#151815] break-words transition hover:border-emerald-400/30 [overflow-wrap:anywhere]">
      <a
        href={href} target={game.isImportedSteam&&!game.hasPlaytestedProfile?"_blank":undefined} rel={game.isImportedSteam&&!game.hasPlaytestedProfile?"noopener noreferrer":undefined}
        className="block aspect-video w-full overflow-hidden bg-[#202520] text-left"
        aria-label={`View ${game.title} details`}
      >
        {game.image && failedImage !== game.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.image}
            alt={game.title}
            loading="lazy"
            onError={() => setFailedImage(game.image)}
            className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#253b2b] to-[#151815] text-sm text-white/45">
            Game image
          </div>
        )}
      </a>

      <div className={`flex flex-1 flex-col ${compact ? "gap-3 p-4" : "gap-4 p-5"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <GenreBadge genre={game.genre} />
        </div>

        <a href={href} target={game.isImportedSteam&&!game.hasPlaytestedProfile?"_blank":undefined} rel={game.isImportedSteam&&!game.hasPlaytestedProfile?"noopener noreferrer":undefined} className="text-left">
          <h3 className="text-lg font-semibold text-white hover:text-emerald-300">
            {game.title}
          </h3>
        </a>

        <p className="text-sm text-white/70">By {game.developer || "Developer not listed"}</p>

        <div className="flex flex-wrap items-center gap-2">
          {game.listingNotice||game.assessmentUnavailable?<span className="rounded border border-amber-200/30 px-3 py-1 text-xs text-amber-100">{game.listingNotice||"Assessment status unavailable"}</span>:<VerificationBadge status={game.verificationStatus ?? "Not yet verified"} />}
          <span title="AI-use disclosure; not independent verification" className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${disclosureStyle}`}>
            {disclosure === "AI use unknown" ? "AI Use Unknown" : `Developer-declared: ${disclosure}`}
          </span>
          {game.recruiting && <span tabIndex={0} aria-label="Recruiting testers. An active playtest has places available. Eligibility requirements apply." title="An active playtest has places available. Eligibility requirements apply." className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"><span aria-hidden="true">◎</span>Recruiting testers</span>}
        </div>

        {game.description ? <details className="group text-sm leading-6 text-white/75">
          <summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-emerald-300">
            <span className="line-clamp-3 group-open:hidden">{game.description}</span>
            <span className="text-xs text-emerald-300 group-open:hidden">Read full description</span>
            <span className="hidden text-xs text-emerald-300 group-open:inline">Hide full description</span>
          </summary>
          <p className="mt-2">{game.description}</p>
        </details> : <p className="text-sm text-white/65">No description provided.</p>}

        <div className="rounded-lg border border-white/10 bg-black/15 p-3">
          {game.communityReception &&
          game.communityReception.ratedTestCount > 0 &&
          game.communityReception.averageOverallScore !== null ? (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                    Community reception
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-white">
                    {game.communityReception.averageOverallScore.toFixed(1)}
                    <span className="text-sm font-semibold text-white/45">/10</span>
                  </p>
                </div>
                <ReceptionBadge status={game.communityReception.receptionStatus} />
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/55">
                <span>
                  {game.communityReception.ratedTestCount.toLocaleString()}{" "}
                  {game.communityReception.ratedTestCount === 1 ? "rating" : "ratings"}
                </span>
                <span>Would recommend <IntentSummary counts={game.recommendationCounts}/></span>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                Community reception
              </p>
              <p className="mt-1 text-sm font-semibold text-white/60">
                Not community tested yet
              </p>
            </div>
          )}
        </div>

        <div className="mt-auto space-y-3 pt-2">

          <a
            href={href} target={game.isImportedSteam&&!game.hasPlaytestedProfile?"_blank":undefined} rel={game.isImportedSteam&&!game.hasPlaytestedProfile?"noopener noreferrer":undefined}
            className="block w-full rounded-md bg-emerald-400 px-3 py-2 text-center text-sm font-semibold text-black hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
          >
            {game.isImportedSteam && !game.hasPlaytestedProfile
              ? "View Steam page ↗"
              : "View game details"}
          </a>
        </div>
      </div>
    </article>
  );
}

function gameHref(game:CatalogueGame){
  return game.isImportedSteam&&!game.hasPlaytestedProfile ? game.gameLink : game.isSubmission ? `/submissions/${game.key}` : `/games/${game.slug}`;
}

export default function GameCatalogue() {
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");

  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("All genres");
  const [verificationFilter, setVerificationFilter] = useState(
    "All verification statuses"
  );
  const [aiType, setAiType] = useState("All AI types");
  const [includeNsfw, setIncludeNsfw] = useState(false);
  const [sort, setSort] = useState("Featured");
  const [page, setPage] = useState(1);

  const [games, setGames] = useState<CatalogueGame[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadGames() {
      const supabase = createClient();

      setLoaded(false);
      setLoadError(false);

      const [catalogueResult, receptionResult] = await Promise.all([
        supabase.rpc("get_public_catalogue", {
          p_page: page,
          p_page_size: PAGE_SIZE,
          p_search: search.trim(),
          p_genre: genre,
          p_verification: verificationFilter,
          p_ai_type: aiType,
          p_include_nsfw: includeNsfw,
          p_sort: sort,
        }),
        supabase.rpc("get_game_community_reception"),
      ]);

      if (cancelled) return;

      if (catalogueResult.error) {
        console.error("Could not load public catalogue:", catalogueResult.error);
        setGames([]);
        setTotalCount(0);
        setLoadError(true);
        setLoaded(true);
        return;
      }

      if (receptionResult.error) {
        console.error("Could not load community reception:", receptionResult.error);
      }

      const rows = (catalogueResult.data ?? []) as CatalogueRpcRow[];
      const publicLinks=await publicLinkedImportedIds(rows.filter(row=>row.source_type==="steam").map(row=>row.game_id));
      if(cancelled)return;
      const recruiting = new Set<string>();
      if(rows.length){
        try{
          const result=await supabase.rpc("get_public_recruitment",{p_games:rows.map(row=>({source_type:row.source_type,game_id:row.game_id}))});
          if(cancelled)return;
          if(result.error||!Array.isArray(result.data))console.warn("Catalogue recruitment summary unavailable",{rpc:"get_public_recruitment",code:result.error?.code||"invalid_response"});
          else for(const row of result.data)if(row.recruiting===true)recruiting.add(`${row.source_type}:${row.game_id}`);
        }catch{console.warn("Catalogue recruitment summary unavailable",{rpc:"get_public_recruitment",code:"request_failed"});}
      }
      if(cancelled)return;
      const listingChanges=await listingUpdates(supabase,rows.map(row=>({kind:row.source_type==="steam"?"imported":"approved",id:row.game_id})));
      const intentData=await publicIntentCounts(supabase,rows.map(row=>({kind:row.source_type==="steam"?"imported":"approved",id:row.game_id})));
      if(cancelled)return;
      const receptionRows = (receptionResult.data ?? []) as CommunityReceptionRow[];

      const receptionByImportedGame = new Map<string, CommunityReception>();
      const receptionByApprovedGame = new Map<string, CommunityReception>();
      const receptionBySubmission = new Map<string, CommunityReception>();

      for (const row of receptionRows) {
        const reception: CommunityReception = {
          acceptedTestCount: Number(row.accepted_test_count ?? 0),
          ratedTestCount: Number(row.rated_test_count ?? 0),
          averageOverallScore:
            row.average_overall_score === null ? null : Number(row.average_overall_score),
          recommendPositivePercent:
            row.recommend_positive_percent === null
              ? null
              : Number(row.recommend_positive_percent),
          continuePositivePercent:
            row.continue_positive_percent === null
              ? null
              : Number(row.continue_positive_percent),
          receptionStatus: row.reception_status,
        };

        if (row.imported_game_id) receptionByImportedGame.set(row.imported_game_id, reception);
        if (row.approved_game_id) receptionByApprovedGame.set(row.approved_game_id, reception);
        if (row.submission_id) receptionBySubmission.set(row.submission_id, reception);
      }

      const mappedGames: CatalogueGame[] = rows.map((original) => {
        const update=listingChanges?.find(item=>item.id===original.game_id&&item.kind===(original.source_type==="steam"?"imported":"approved"));
        const row={...original,...update?.fields};
        const isImportedSteam = row.source_type === "steam";
        const steamAppId = normalizeSteamAppId(row.steam_app_id);

        const communityReception = isImportedSteam
          ? receptionByImportedGame.get(row.game_id) ?? null
          : receptionBySubmission.get(row.game_id) ??
            receptionByApprovedGame.get(row.game_id) ??
            null;

        return {
          key: row.game_id,
          slug: isImportedSteam
            ? `steam-${steamAppId}`
            : `submission-${row.game_id}`,
          title: row.title ?? "Untitled game",
          developer: row.developer_name ?? "Unknown developer",
          genre: row.genre ?? "Uncategorised",
          description: row.description ?? "",
          image: row.image_url ?? "",
          aiType: row.ai_type ?? "AI use unknown",
          score: Number(row.quality_score ?? 0),
          gameLink: isImportedSteam?steamStoreUrl(row.game_link,steamAppId):row.game_link,
          steamAppId,
          isSubmission: !isImportedSteam,
          isImportedSteam,
          hasPlaytestedProfile: isImportedSteam&&/^[0-9]+$/.test(steamAppId)&&publicLinks?.has(row.game_id)===true,
          isNsfw: row.is_nsfw === true,
          verificationStatus: row.verification_status ?? "Not yet verified",
          submittedAt: row.submitted_at ?? "",
          communityReception,
          recruiting: recruiting.has(`${row.source_type}:${row.game_id}`),
          listingNotice: listingNotice(update),
          assessmentUnavailable: listingChanges===null,
          recommendationCounts:intentData?.find(item=>item.id===row.game_id&&item.kind===(row.source_type==="steam"?"imported":"approved"))?.lifetime.recommend,
        };
      });

      setGames(mappedGames);
      setTotalCount(
        rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0
      );
      setLoaded(true);
    }

    const timer = window.setTimeout(
      () => {
        void loadGames();
      },
      search.trim() ? 250 : 0
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    page,
    search,
    genre,
    verificationFilter,
    aiType,
    includeNsfw,
    sort,
  ]);

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);

  function resetFilters() {
    setSearch("");
    setGenre("All genres");
    setVerificationFilter("All verification statuses");
    setAiType("All AI types");
    setIncludeNsfw(false);
    setSort("Featured");
    setPage(1);
  }

  const fieldClass =
    "min-w-0 w-full rounded-lg border border-white/25 bg-[#151815] px-4 py-3.5 text-base font-medium text-white shadow-sm outline-none transition placeholder:text-white/45 hover:border-emerald-400/45 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40";

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 pt-2 text-white sm:px-6">
      <section className="rounded-xl border border-white/15 bg-[#101310] p-4 shadow-lg shadow-black/20 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-300">
              Game discovery
            </p>
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Find games worth your time
            </h2>
          </div>
          <span className="text-sm text-white/55">
            {totalCount.toLocaleString()}{" "}
            {totalCount === 1 ? "game" : "games"} listed
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <input
            type="search"
            aria-label="Search games"
            placeholder="Search games, developers, genres..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className={fieldClass}
          />

          <select
            aria-label="Filter by genre"
            value={genre}
            onChange={(event) => {
              setGenre(event.target.value);
              setPage(1);
            }}
            className={fieldClass}
          >
            {genres.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by independent assessment"
            value={verificationFilter}
            onChange={(event) => {
              setVerificationFilter(event.target.value);
              setPage(1);
            }}
            className={fieldClass}
          >
            {verificationOptions.map((item) => (
              <option key={item} value={item}>
                {item==="All verification statuses"?"All independent assessments":["Verified","Assessed","Not yet verified"].includes(item)?assessmentLabel(item):item}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by AI use"
            value={aiType}
            onChange={(event) => {
              setAiType(event.target.value);
              setPage(1);
            }}
            className={fieldClass}
          >
            {aiTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort games"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPage(1);
            }}
            className={fieldClass}
          >
            {sortOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-white/25 bg-[#151815] px-4 py-3.5 transition hover:border-emerald-400/45">
            <span>
              <span className="block text-base font-semibold text-white">
                Include NSFW
              </span>
              <span className="mt-0.5 block text-xs text-white/50">
                Show explicit adult-content games
              </span>
            </span>

            <span className="relative inline-flex shrink-0">
              <input
                type="checkbox"
                checked={includeNsfw}
                onChange={(event) => {
                  setIncludeNsfw(event.target.checked);
                  setPage(1);
                }}
                className="peer sr-only"
              />
              <span className="h-6 w-11 rounded-full bg-white/20 transition peer-checked:bg-emerald-400" />
              <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5 peer-checked:bg-black" />
            </span>
          </label>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border border-white/25 px-4 py-3.5 text-base font-semibold text-white transition hover:border-white/45 hover:bg-white/[0.06]"
          >
            Clear filters
          </button>
        </div>
      </section>

      <section className="space-y-5 border-t border-white/10 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              Explore the catalogue
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Browse games and feedback
            </h2>
            <p className="mt-2 text-base text-white/60">
              {totalCount.toLocaleString()}{" "}
              {totalCount === 1 ? "game" : "games"} found
            </p>
          </div>

          {!loaded && (
            <p className="text-sm text-white/55">
              Loading catalogue listings...
            </p>
          )}
          <div role="group" aria-label="Catalogue view" className="flex flex-wrap gap-2">
            {(["compact", "comfortable"] as const).map((view) => <button key={view} type="button" aria-pressed={density === view} onClick={() => setDensity(view)} className={`rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${density === view ? "border-emerald-300 bg-emerald-300/15 text-emerald-200" : "border-white/25 text-white/75 hover:border-white/50"}`}>{view === "compact" ? "Compact" : "Comfortable"}</button>)}
          </div>
        </div>

        {loadError && (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100">
            The catalogue could not be loaded. Please try again. Check the
            browser console for details if the problem continues.
          </p>
        )}

        {games.length > 0 ? (
          <div data-catalogue-density={density} className={`grid ${density === "compact" ? "gap-4" : "gap-6"}`} style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${density === "compact" ? "240px" : "330px"}), 1fr))` }}>
            {games.map((game) => (
              <GameCardContent
                key={game.key}
                game={game}
                compact={density === "compact"}
                href={gameHref(game)}
              />
            ))}
          </div>
        ) : loaded && !loadError ? (
          <div className="rounded-xl border border-white/10 bg-[#151815] px-5 py-12 text-center">
            <h3 className="text-lg font-semibold">No games found</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
              Try another independent assessment filter or clear your filters. Steam
              listings only appear after they meet the preliminary catalogue
              eligibility and metadata requirements.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
            >
              Clear filters
            </button>
          </div>
        ) : null}

        {loaded && !loadError && pageCount > 1 && (
          <nav
            aria-label="Game catalogue pages"
            className="flex flex-wrap items-center justify-center gap-2 pt-4"
          >
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-md border border-white/25 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-30"
            >
              Previous
            </button>

            {Array.from({ length: Math.min(pageCount, 7) }, (_, index) => {
              const startPage = Math.max(
                1,
                Math.min(currentPage - 3, pageCount - 6)
              );

              return startPage + index;
            }).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                aria-current={currentPage === pageNumber ? "page" : undefined}
                onClick={() => setPage(pageNumber)}
                className={`rounded-md border px-3 py-2 text-sm ${
                  currentPage === pageNumber
                    ? "border-emerald-400 bg-emerald-400 font-bold text-black"
                    : "border-white/25 text-white hover:bg-white/5"
                }`}
              >
                {pageNumber}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage === pageCount}
              onClick={() =>
                setPage((current) => Math.min(pageCount, current + 1))
              }
              className="rounded-md border border-white/25 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}
