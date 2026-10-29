"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "../../lib/supabase";
import {testerRankPresentation} from "@/lib/tester-rank";

import {currentJourney,subscribeJourney,carryJourney} from "@/lib/share-links";
const navLinks = [
  { label: "Home", href: "/" },
  { label: "Community", href: "/community" },
];

type SignupRole = "player" | "tester" | "developer";

function getLevel(totalXp: number) {
  let level = 1;
  let remainingXp = Math.max(0, totalXp);

  while (true) {
    const requiredForNextLevel = 100 + (level - 1) * 50;

    if (remainingXp < requiredForNextLevel) {
      return level;
    }

    remainingXp -= requiredForNextLevel;
    level += 1;
  }
}

export default function SiteHeader() {
  const journey=useSyncExternalStore(subscribeJourney,currentJourney,()=>null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [roles, setRoles] = useState<SignupRole[]>(["player"]);
  const [testerRank,setTesterRank] = useState<number|null>(null);
  const [developerXp, setDeveloperXp] = useState(0);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function loadProfile(userId: string) {
      setProfileLoaded(false);

      const { data, error } = await supabase
        .from("profiles")
        .select("role, roles, tester_xp, developer_xp")
        .eq("id", userId)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        setRole("user");
        setRoles(["player"]);
        setTesterRank(null);
        setDeveloperXp(0);
      } else {
        setRole(data?.role ?? "user");

        setRoles(
          Array.isArray(data?.roles)
            ? data.roles.filter(
                (item: string): item is SignupRole =>
                  ["player", "tester", "developer"].includes(item)
              )
            : ["player"]
        );

        const {data:progress} = await supabase.rpc("get_my_testing_progress");
        if (!mounted) return;
        setTesterRank(progress?.rank ?? null);
        setDeveloperXp(data?.developer_xp ?? 0);
      }

      setProfileLoaded(true);
    }

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setLoggedIn(!!session);
      setEmail(session?.user?.email ?? "");
      setCheckingSession(false);

      if (session?.user) {
        void loadProfile(session.user.id);
      } else {
        setEmail("");
        setRole("user");
        setRoles(["player"]);
        setTesterRank(null);
        setDeveloperXp(0);
        setProfileLoaded(true);
      }
    }

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      setLoggedIn(!!session);
      setEmail(session?.user?.email ?? "");

      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        setCheckingSession(false);
      }

      if (session?.user) {
        void loadProfile(session.user.id);
      } else {
        setEmail("");
        setRole("user");
        setRoles(["player"]);
        setTesterRank(null);
        setDeveloperXp(0);
        setProfileLoaded(true);
      }
    });

    function handleRolesUpdated() {
      void checkSession();
    }

    window.addEventListener("playtested-roles-updated", handleRolesUpdated);

    return () => {
      mounted = false;
      subscription.unsubscribe();

      window.removeEventListener(
        "playtested-roles-updated",
        handleRolesUpdated
      );
    };
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      window.alert("Could not log out. Please try again.");
      return;
    }

    window.location.href = "/";
  }


  const developerLevel = getLevel(developerXp);

  const showRoleLinks = loggedIn && profileLoaded;

  const rankPresentation=testerRankPresentation(testerRank);
  const showTesterLevel =
    loggedIn && profileLoaded && roles.includes("tester");

  const showDeveloperLevel =
    loggedIn && profileLoaded && roles.includes("developer");

  const allNavLinks = [
    ...navLinks,

    ...(showRoleLinks && roles.includes("developer")
      ? [
          { label: "Submit a Game", href: "/submit" },
          { label: "My Games", href: "/my-submissions" },
        ]
      : []),

    ...(showRoleLinks && roles.includes("tester")
      ? [{ label: "Tester Hub", href: carryJourney("/tester",journey) }]
      : []),

    ...(!checkingSession && loggedIn && role === "admin"
      ? [{ label: "Admin Review", href: "/admin/submissions" }]
      : []),

    ...(!checkingSession && loggedIn
      ? [{ label: "Account", href: "/account" }]
      : []),
  ];

  const navLinkClass =
    "block rounded-md px-3 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.05] hover:text-white sm:py-2";

  return (
    <header className="border-b border-white/[0.08]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
        <a
          href="/"
          className="shrink-0 font-[family-name:var(--font-display)] text-xl font-bold tracking-wider sm:text-2xl"
        >
          PLAYTESTED<span className="text-[#77f29b]">_</span>
        </a>

        <div className="flex items-center gap-2 sm:gap-3">
          {!checkingSession &&
            (loggedIn ? (
              <>
                <div className="hidden max-w-[520px] items-center gap-2 px-2 py-2 text-sm text-zinc-300 sm:inline-flex">
                  <span className="mr-1 truncate">{email}</span>

                  {showTesterLevel && (
                    <span className={`shrink-0 rounded-full border px-2 py-1 text-xs font-semibold ${rankPresentation.badge}`}>
                      {rankPresentation.label}
                    </span>
                  )}

                  {showDeveloperLevel && (
                    <span className="shrink-0 rounded-full border border-[#77f29b]/30 bg-[#77f29b]/10 px-2 py-1 text-xs font-semibold text-[#77f29b]">
                      Developer Lv. {developerLevel}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md border border-white/15 px-3 py-2 text-xs text-zinc-300 transition hover:border-white/30 hover:text-white sm:text-sm"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <a
                  href={journey?"/login?next="+encodeURIComponent(window.location.pathname+window.location.search):"/login"}
                  className="rounded-md px-2 py-2 text-sm text-zinc-300 transition hover:text-white"
                >
                  Log in
                </a>

                <a
                  href={journey?"/login?mode=signup&next="+encodeURIComponent(window.location.pathname+window.location.search):"/login?mode=signup"}
                  className="rounded-md bg-[#77f29b] px-3 py-2 text-sm font-semibold text-[#09100b] transition hover:bg-[#9af8b4]"
                >
                  Sign up
                </a>
              </>
            ))}

          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-sm text-white transition hover:border-[#77f29b]/50 sm:hidden"
          >
            <span>{mobileMenuOpen ? "Close" : "Menu"}</span>
            <span aria-hidden="true">{mobileMenuOpen ? "×" : "☰"}</span>
          </button>
        </div>
      </div>

      <nav
        aria-label="Main navigation"
        className="mx-auto hidden max-w-7xl flex-wrap gap-x-6 gap-y-2 px-6 pb-4 text-sm text-zinc-400 sm:flex"
      >
        {allNavLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="shrink-0 transition hover:text-white"
          >
            {link.label}
          </a>
        ))}
      </nav>

      {mobileMenuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-white/[0.08] bg-[#0e110f] px-4 py-3 sm:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {allNavLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={navLinkClass}
              >
                {link.label}
              </a>
            ))}

            {loggedIn && (
              <div className="mt-2 border-t border-white/10 px-3 pt-3">
                <p className="truncate text-xs text-zinc-400">{email}</p>

                <div className="mt-2 flex flex-col gap-1">
                  {showTesterLevel && (
                    <p className={`self-start rounded-full border px-2 py-1 text-xs ${rankPresentation.badge}`}>
                      {rankPresentation.label}
                    </p>
                  )}

                  {showDeveloperLevel && (
                    <p className="text-xs text-[#77f29b]">
                      Developer level: {developerLevel}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
