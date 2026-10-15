
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { games as sampleGames } from "@/app/data/games";
import { createClient } from "@/lib/supabase";

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
  price: string;
  gameLink?: string;
  isSubmission: boolean;
  verificationStatus: VerificationStatus | null;
  submittedAt?: string;
};

type VerificationRow = {
  game_id: string;
  verification_status: VerificationStatus;
  quality_score: number | null;
};

type CartItem = {
  game: CatalogueGame;
  quantity: number;
};

const aiTypes = [
  "All AI types",
  "AI-generated",
  "AI-assisted",
  "No AI disclosed",
];

const priceOptions = ["All prices", "Free", "Paid"];

const sortOptions = [
  "Featured",
  "Recently added",
  "Highest rated",
  "Price: low to high",
  "Title A-Z",
];

const verificationOptions = [
  "All verification statuses",
  "Verified",
  "Assessed",
  "Not yet verified",
  "Demo listings",
];

const PAGE_SIZE = 12;

function parsePrice(price: string): number {
  const cleaned = price.replace(/[£,\s]/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function formatPrice(price: string): string {
  if (!price || price.toLowerCase() === "free") return "Free";

  const value = parsePrice(price);
  return value === 0 ? "Free" : `£${value.toFixed(2)}`;
}

function getVerificationStatus(
  verification?: VerificationRow
): VerificationStatus {
  if (
    verification?.verification_status === "Verified" ||
    verification?.verification_status === "Assessed" ||
    verification?.verification_status === "Not yet verified"
  ) {
    return verification.verification_status;
  }

  return "Not yet verified";
}

function VerificationBadge({
  status,
}: {
  status: VerificationStatus | null;
}) {
  if (!status) {
    return (
      <span className="inline-flex rounded-full border border-white/15 px-3 py-1 text-xs text-white/60">
        Demo listing
      </span>
    );
  }

  const styles: Record<VerificationStatus, string> = {
    Verified:
      "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    Assessed:
      "border-amber-400/40 bg-amber-400/10 text-amber-200",
    "Not yet verified":
      "border-white/20 bg-white/5 text-white/60",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function GenreBadge({ genre }: { genre: string }) {
  return (
    <span className="inline-flex w-fit rounded-md border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300 sm:text-sm">
      {genre}
    </span>
  );
}

function GameCardContent({
  game,
  onOpen,
  onBuy,
  onAddToCart,
  onInstall,
}: {
  game: CatalogueGame;
  onOpen: () => void;
  onBuy: () => void;
  onAddToCart: () => void;
  onInstall: () => void;
}) {
  const isFree = parsePrice(game.price) === 0;
  const canPurchase =
    game.isSubmission && game.verificationStatus === "Verified";

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#151815] transition hover:border-white/25">
      <button
        type="button"
        onClick={onOpen}
        className="block aspect-video w-full overflow-hidden bg-[#202520] text-left"
        aria-label={`View ${game.title} details`}
      >
        {game.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.image}
            alt={game.title}
            className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/40">
            Game image
          </div>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <GenreBadge genre={game.genre} />
          <VerificationBadge status={game.verificationStatus} />
        </div>

        <button type="button" onClick={onOpen} className="text-left">
          <h3 className="text-lg font-semibold text-white hover:text-emerald-300">
            {game.title}
          </h3>
        </button>

        <p className="text-sm text-white/55">by {game.developer}</p>

        <p className="line-clamp-3 text-sm leading-6 text-white/75">
          {game.description}
        </p>

        <div className="mt-auto space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-white/60">{game.aiType}</span>
            <span className="font-semibold text-white">
              {formatPrice(game.price)}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {isFree ? (
              <button
                type="button"
                onClick={onInstall}
                className="flex-1 rounded-md bg-emerald-400 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
              >
                Install
              </button>
            ) : canPurchase ? (
              <>
                <button
                  type="button"
                  onClick={onBuy}
                  className="flex-1 rounded-md bg-emerald-400 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
                >
                  Buy now
                </button>
                <button
                  type="button"
                  onClick={onAddToCart}
                  className="rounded-md border border-white/20 px-3 py-2 text-sm text-white hover:bg-white/5"
                >
                  Add to cart
                </button>
              </>
            ) : (
              <span className="flex-1 rounded-md border border-white/10 px-3 py-2 text-center text-sm text-white/50">
                {game.verificationStatus === "Verified"
                  ? "Purchase unavailable"
                  : "Awaiting verification"}
              </span>
            )}

            <button
              type="button"
              onClick={onOpen}
              className="rounded-md border border-white/20 px-3 py-2 text-sm text-white hover:bg-white/5"
            >
              Details
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function GameCatalogue() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("All genres");
  const [verificationFilter, setVerificationFilter] = useState(
    "All verification statuses"
  );
  const [aiType, setAiType] = useState("All AI types");
  const [priceFilter, setPriceFilter] = useState("All prices");
  const [sort, setSort] = useState("Featured");
  const [page, setPage] = useState(1);

  const [approvedGames, setApprovedGames] = useState<CatalogueGame[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartMessage, setCartMessage] = useState("");
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [installGame, setInstallGame] = useState<CatalogueGame | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGames() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("approved_games")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Could not load approved games:", error);
        setLoadError(true);
        setLoaded(true);
        return;
      }

      const { data: verificationData, error: verificationError } =
        await supabase.from("published_game_verifications").select("*");

      if (cancelled) return;

      if (verificationError) {
        console.error(
          "Could not load published verifications:",
          verificationError
        );
      }

      const verifications = (verificationData ?? []) as VerificationRow[];

      const mappedGames: CatalogueGame[] = (data ?? []).map((row: any) => {
        const verification = verifications.find(
          (item) => item.game_id === row.id
        );

        return {
          key: row.id,
          slug: `submission-${row.id}`,
          title: row.title ?? "Untitled game",
          developer:
            row.developer_name ?? row.developer ?? "Unknown developer",
          genre: row.genre ?? "Uncategorised",
          description: row.description ?? "",
          image: row.image_url ?? "",
          aiType: row.ai_type ?? "No AI disclosed",
          score: verification?.quality_score ?? 0,
          price: row.price == null ? "Free" : String(row.price),
          gameLink: row.game_link ?? "",
          isSubmission: true,
          verificationStatus: getVerificationStatus(verification),
          submittedAt: row.submitted_at ?? "",
        };
      });

      setApprovedGames(mappedGames);
      setLoaded(true);
    }

    void loadGames();

    return () => {
      cancelled = true;
    };
  }, []);

  const demoGames: CatalogueGame[] = (sampleGames as any[]).map(
    (game, index) => ({
      key: String(game.key ?? game.id ?? game.slug ?? index),
      slug: String(game.slug ?? game.id ?? `demo-${index}`),
      title: String(game.title ?? "Untitled game"),
      developer: String(game.developer ?? "Unknown developer"),
      genre: String(game.genre ?? "Uncategorised"),
      description: String(game.description ?? ""),
      image: String(game.image ?? game.image_url ?? ""),
      aiType: String(game.aiType ?? game.ai_type ?? "No AI disclosed"),
      score: Number(game.score ?? 0),
      price: String(game.price ?? "Free"),
      gameLink: game.gameLink ?? game.game_link ?? "",
      isSubmission: false,
      verificationStatus: null,
    })
  );

  const catalogueGames = useMemo(
    () => [...approvedGames, ...demoGames],
    [approvedGames]
  );

  const genres = useMemo(
    () => [
      "All genres",
      ...Array.from(new Set(catalogueGames.map((game) => game.genre)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    ],
    [catalogueGames]
  );

  const availableAiTypes = useMemo(
    () => [
      "All AI types",
      ...Array.from(new Set(catalogueGames.map((game) => game.aiType)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    ],
    [catalogueGames]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    const result = catalogueGames.filter((game) => {
      const searchableText =
        `${game.title} ${game.developer} ${game.genre} ${game.description}`.toLowerCase();

      const matchesPrice =
        priceFilter === "All prices" ||
        (priceFilter === "Free" && parsePrice(game.price) === 0) ||
        (priceFilter === "Paid" && parsePrice(game.price) > 0);

      const matchesVerification =
        verificationFilter === "All verification statuses" ||
        (verificationFilter === "Demo listings" && !game.isSubmission) ||
        (verificationFilter === "Verified" &&
          game.verificationStatus === "Verified") ||
        (verificationFilter === "Assessed" &&
          game.verificationStatus === "Assessed") ||
        (verificationFilter === "Not yet verified" &&
          game.isSubmission &&
          game.verificationStatus === "Not yet verified");

      return (
        searchableText.includes(term) &&
        (genre === "All genres" || game.genre === genre) &&
        (aiType === "All AI types" || game.aiType === aiType) &&
        matchesPrice &&
        matchesVerification
      );
    });

    if (sort === "Recently added") {
      result.sort((a, b) =>
        (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "")
      );
    } else if (sort === "Highest rated") {
      result.sort((a, b) => b.score - a.score);
    } else if (sort === "Price: low to high") {
      result.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else if (sort === "Title A-Z") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [
    catalogueGames,
    search,
    genre,
    aiType,
    priceFilter,
    sort,
    verificationFilter,
  ]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Prioritise real approved submissions, then fill remaining spaces with clearly labelled demos.
  const recentlyAdded: CatalogueGame[] = [
    ...approvedGames.slice(0, 4),
    ...demoGames.slice(0, Math.max(0, 4 - Math.min(approvedGames.length, 4))),
  ];

  function resetFilters() {
    setSearch("");
    setGenre("All genres");
    setVerificationFilter("All verification statuses");
    setAiType("All AI types");
    setPriceFilter("All prices");
    setSort("Featured");
    setPage(1);
  }

  function openGame(game: CatalogueGame) {
    if (game.isSubmission) {
      router.push(`/submissions/${game.key}`);
    } else {
      router.push(`/games/${game.slug}`);
    }
  }

  function addToCart(game: CatalogueGame) {
    // Only verified real submissions can be added to the cart.
    if (!game.isSubmission || game.verificationStatus !== "Verified") {
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.game.key === game.key);

      if (existing) {
        return current.map((item) =>
          item.game.key === game.key
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...current, { game, quantity: 1 }];
    });

    setCartMessage(`${game.title} added to your demo cart.`);
    setCheckoutMessage("");
  }

  function buyNow(game: CatalogueGame) {
    // Prevent unverified listings from entering the purchase flow.
    if (!game.isSubmission || game.verificationStatus !== "Verified") {
      return;
    }

    addToCart(game);
    setShowCart(true);
  }

  function removeFromCart(key: string) {
    setCart((current) => current.filter((item) => item.game.key !== key));
    setCartMessage("");
  }

  const cartTotal = cart.reduce(
    (total, item) => total + parsePrice(item.game.price) * item.quantity,
    0
  );

  function checkout() {
    setCheckoutMessage(
      "Checkout is not connected yet. No payment has been taken."
    );
  }

  return (
    <div className="w-full space-y-10 pt-12 text-white">
      <section className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Discover games
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            The Playtested Store
          </h1>
          <p className="mt-3 max-w-2xl text-white/65">
            Explore games with clearer AI disclosures and evidence-based
            verification. A listing is not the same as a completed assessment.
          </p>
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
            className="min-w-0 rounded-md border border-white/15 bg-[#151815] px-3 py-3 text-sm text-white placeholder:text-white/40"
          />

          <select
            aria-label="Filter by genre"
            value={genre}
            onChange={(event) => {
              setGenre(event.target.value);
              setPage(1);
            }}
            className="min-w-0 rounded-md border border-white/15 bg-[#151815] px-3 py-3 text-sm text-white"
          >
            {genres.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by verification status"
            value={verificationFilter}
            onChange={(event) => {
              setVerificationFilter(event.target.value);
              setPage(1);
            }}
            className="min-w-0 rounded-md border border-white/15 bg-[#151815] px-3 py-3 text-sm text-white"
          >
            {verificationOptions.map((item) => (
              <option key={item} value={item}>
                {item}
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
            className="min-w-0 rounded-md border border-white/15 bg-[#151815] px-3 py-3 text-sm text-white"
          >
            {Array.from(new Set([...aiTypes, ...availableAiTypes])).map(
              (item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              )
            )}
          </select>

          <select
            aria-label="Filter by price"
            value={priceFilter}
            onChange={(event) => {
              setPriceFilter(event.target.value);
              setPage(1);
            }}
            className="min-w-0 rounded-md border border-white/15 bg-[#151815] px-3 py-3 text-sm text-white"
          >
            {priceOptions.map((item) => (
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
            className="min-w-0 rounded-md border border-white/15 bg-[#151815] px-3 py-3 text-sm text-white"
          >
            {sortOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-md border border-white/20 px-4 py-3 text-sm text-white hover:bg-white/5"
          >
            Clear filters
          </button>

          <button
            type="button"
            onClick={() => {
              setShowCart(true);
              setCheckoutMessage("");
            }}
            className="rounded-md border border-emerald-400/40 px-4 py-3 text-sm text-emerald-300 hover:bg-emerald-400/10"
          >
            Cart ({cart.reduce((total, item) => total + item.quantity, 0)})
          </button>
        </div>
      </section>

      {recentlyAdded.length > 0 && (
        <section className="relative overflow-hidden rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-[#142119] via-[#101612] to-[#0c0f0d] p-4 shadow-[0_0_40px_rgba(119,242,155,0.04)] sm:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-400/[0.06] blur-3xl"
          />

          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-2xl text-emerald-300">
                  ✦
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">
                    Fresh discoveries
                  </p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                    New to Playtested
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                    Recently submitted games and sample listings to explore.
                    Demo examples are labelled so you know what is real.
                  </p>
                </div>
              </div>

              <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Recently added
              </span>
            </div>

            <div className="my-5 h-px bg-gradient-to-r from-emerald-300/50 via-emerald-300/15 to-transparent" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {recentlyAdded.map((game) => {
                const isFree = parsePrice(game.price) === 0;
                const canPurchase =
                  game.isSubmission &&
                  game.verificationStatus === "Verified";

                return (
                  <article
                    key={game.key}
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#111612] transition duration-200 hover:-translate-y-1 hover:border-emerald-300/50 hover:bg-[#172019]"
                  >
                    <button
                      type="button"
                      onClick={() => openGame(game)}
                      className="relative block aspect-video w-full overflow-hidden bg-[#202520] text-left"
                      aria-label={`View ${game.title} details`}
                    >
                      {game.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={game.image}
                          alt={game.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-white/40">
                          Game image
                        </div>
                      )}

                      <span
                        className={`absolute left-3 top-3 rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${
                          game.isSubmission
                            ? "border-emerald-300/40 bg-[#0b1b10]/90 text-emerald-300"
                            : "border-amber-300/40 bg-[#21180a]/90 text-amber-200"
                        }`}
                      >
                        {game.isSubmission ? "New listing" : "Demo example"}
                      </span>
                    </button>

                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <GenreBadge genre={game.genre} />
                        <VerificationBadge status={game.verificationStatus} />
                      </div>

                      <button
                        type="button"
                        onClick={() => openGame(game)}
                        className="text-left"
                      >
                        <h3 className="font-semibold text-white transition hover:text-emerald-300">
                          {game.title}
                        </h3>
                      </button>

                      <p className="text-sm text-white/55">
                        by {game.developer}
                      </p>

                      <div className="mt-auto space-y-3 pt-2">
                        <div className="flex items-center justify-between gap-2 border-t border-white/[0.08] pt-3">
                          <span className="text-xs text-white/50">
                            {game.isSubmission
                              ? "Community submission"
                              : "Sample catalogue entry"}
                          </span>
                          <span className="font-semibold text-white">
                            {formatPrice(game.price)}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {isFree ? (
                            <button
                              type="button"
                              onClick={() => setInstallGame(game)}
                              className="flex-1 rounded-md bg-emerald-400 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
                            >
                              Install
                            </button>
                          ) : canPurchase ? (
                            <>
                              <button
                                type="button"
                                onClick={() => buyNow(game)}
                                className="flex-1 rounded-md bg-emerald-400 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
                              >
                                Buy now
                              </button>
                              <button
                                type="button"
                                onClick={() => addToCart(game)}
                                className="rounded-md border border-white/20 px-3 py-2 text-sm text-white hover:bg-white/5"
                              >
                                Add to cart
                              </button>
                            </>
                          ) : (
                            <span className="flex-1 rounded-md border border-white/10 px-3 py-2 text-center text-sm text-white/50">
                              {game.verificationStatus === "Verified"
                                ? "Purchase unavailable"
                                : "Awaiting verification"}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => openGame(game)}
                            className="rounded-md border border-white/20 px-3 py-2 text-sm text-white hover:bg-white/5"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="space-y-5 border-t border-white/10 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Explore the catalogue
            </p>
            <h2 className="text-2xl font-bold tracking-tight">
              Browse all games
            </h2>
            <p className="mt-1 text-sm text-white/55">
              {filtered.length} {filtered.length === 1 ? "game" : "games"} found
            </p>
          </div>

          {!loaded && (
            <p className="text-sm text-white/50">
              Loading approved listings...
            </p>
          )}
        </div>

        {loadError && (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100">
            Approved listings could not be loaded. Demo listings may still be
            available. Check the browser console for details.
          </p>
        )}

        {visible.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {visible.map((game) => (
              <GameCardContent
                key={game.key}
                game={game}
                onOpen={() => openGame(game)}
                onBuy={() => buyNow(game)}
                onAddToCart={() => addToCart(game)}
                onInstall={() => setInstallGame(game)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#151815] px-5 py-12 text-center">
            <h3 className="text-lg font-semibold">No games found</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/55">
              Try another verification status or clear your filters. Verified
              only shows listings that meet the published verification criteria.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
            >
              Clear filters
            </button>
          </div>
        )}

        {pageCount > 1 && (
          <nav
            aria-label="Game catalogue pages"
            className="flex flex-wrap items-center justify-center gap-2 pt-4"
          >
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-md border border-white/20 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-30"
            >
              Previous
            </button>

            {Array.from({ length: pageCount }, (_, index) => index + 1).map(
              (pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  aria-current={
                    currentPage === pageNumber ? "page" : undefined
                  }
                  onClick={() => setPage(pageNumber)}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    currentPage === pageNumber
                      ? "border-emerald-400 bg-emerald-400 text-black"
                      : "border-white/20 text-white hover:bg-white/5"
                  }`}
                >
                  {pageNumber}
                </button>
              )
            )}

            <button
              type="button"
              disabled={currentPage === pageCount}
              onClick={() =>
                setPage((current) => Math.min(pageCount, current + 1))
              }
              className="rounded-md border border-white/20 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next
            </button>
          </nav>
        )}
      </section>

      {showCart && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowCart(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-heading"
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/15 bg-[#151815] p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 id="cart-heading" className="text-xl font-semibold">
                Your cart
              </h2>
              <button
                type="button"
                onClick={() => setShowCart(false)}
                className="rounded-md border border-white/20 px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="py-8 text-sm text-white/60">
                Your cart is empty.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {cart.map((item) => (
                  <div
                    key={item.game.key}
                    className="flex items-center justify-between gap-4 border-b border-white/10 pb-4"
                  >
                    <div>
                      <p className="font-medium">{item.game.title}</p>
                      <p className="mt-1 text-sm text-white/55">
                        {item.quantity} × {formatPrice(item.game.price)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.game.key)}
                      className="text-sm text-red-300 hover:text-red-200"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <div className="flex justify-between font-semibold">
                  <span>Demo total</span>
                  <span>£{cartTotal.toFixed(2)}</span>
                </div>

                <button
                  type="button"
                  onClick={checkout}
                  className="w-full rounded-md bg-emerald-400 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-300"
                >
                  Continue to checkout
                </button>
              </div>
            )}

            {cartMessage && (
              <p className="mt-4 text-sm text-emerald-300">{cartMessage}</p>
            )}

            {checkoutMessage && (
              <p className="mt-4 rounded-md border border-amber-400/30 p-3 text-sm text-amber-100">
                {checkoutMessage}
              </p>
            )}

            <p className="mt-4 text-xs text-white/40">
              Cart and checkout are currently a prototype. No payment is taken.
            </p>
          </section>
        </div>
      )}

      {installGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-heading"
            className="w-full max-w-md rounded-xl border border-white/15 bg-[#151815] p-6"
          >
            <h2 id="install-heading" className="text-xl font-semibold">
              {installGame.title}
            </h2>

            <p className="mt-3 text-sm leading-6 text-white/65">
              Direct game downloads and installation are not available yet on
              Playtested.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {installGame.gameLink && (
                <a
                  href={installGame.gameLink}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
                >
                  Visit game website
                </a>
              )}

              <button
                type="button"
                onClick={() => setInstallGame(null)}
                className="rounded-md border border-white/20 px-4 py-2 text-sm"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}