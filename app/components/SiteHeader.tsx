"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { testerRankPresentation } from "@/lib/tester-rank";
import { currentJourney, subscribeJourney, carryJourney } from "@/lib/share-links";
import NotificationBell from "./NotificationBell";

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
    if (remainingXp < requiredForNextLevel) return level;
    remainingXp -= requiredForNextLevel;
    level += 1;
  }
}


type HeaderAuthState = {
  loggedIn: boolean;
  checkingSession: boolean;
  email: string;
  role: string;
  roles: SignupRole[];
  testerRank: number | null;
  developerXp: number;
  profileLoaded: boolean;
};

// Lives above route content so the navigation remains stable across page changes.
const HeaderAuthContext = createContext<HeaderAuthState | null>(null);

export function SiteHeaderProvider({ children }: { children: React.ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [roles, setRoles] = useState<SignupRole[]>(["player"]);
  const [testerRank, setTesterRank] = useState<number | null>(null);
  const [developerXp, setDeveloperXp] = useState(0);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    let lastUserId: string | null = null;
    let profileRequest = 0;
    let authEventSeen = false;

    const clearProfile = () => {
      setRole("user");
      setRoles(["player"]);
      setTesterRank(null);
      setDeveloperXp(0);
    };

    async function loadProfile(userId: string, keepCurrent: boolean) {
      const request = ++profileRequest;
      if (!keepCurrent) setProfileLoaded(false);
      const { data, error } = await supabase
        .from("profiles")
        .select("role, roles, tester_xp, developer_xp")
        .eq("id", userId)
        .maybeSingle();

      if (!mounted || request !== profileRequest) return;
      if (error) {
        clearProfile();
        setProfileLoaded(true);
        return;
      }

      const nextRoles: SignupRole[] = Array.isArray(data?.roles)
        ? data.roles.filter((item: string): item is SignupRole => ["player", "tester", "developer"].includes(item))
        : ["player"];
      setRole(data?.role ?? "user");
      setRoles(nextRoles);
      setDeveloperXp(data?.developer_xp ?? 0);
      // Navigation needs the role information, not the later XP request.
      setProfileLoaded(true);

      if (!nextRoles.includes("tester")) {
        setTesterRank(null);
        return;
      }
      try {
        const { data: progress } = await supabase.rpc("get_my_testing_progress");
        if (mounted && request === profileRequest) setTesterRank(progress?.rank ?? null);
      } catch {
        if (mounted && request === profileRequest) setTesterRank(null);
      }
    }

    function applySession(session: { user: { id: string; email?: string } } | null, forceProfile = false) {
      if (!mounted) return;
      const id = session?.user?.id ?? null;
      const sameUser = id !== null && id === lastUserId;
      lastUserId = id;
      setLoggedIn(Boolean(session));
      setEmail(session?.user?.email ?? "");
      setCheckingSession(false);

      if (!id) {
        profileRequest++;
        clearProfile();
        setProfileLoaded(true);
      } else {
        if (!sameUser) {
          clearProfile();
          setProfileLoaded(false);
        }
        if (!sameUser || forceProfile) void loadProfile(id, sameUser);
      }
    }

    // INITIAL_SESSION and getSession can resolve in either order. Apply the
    // first known session, but do not reset the header on routine token refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (!["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) return;
      authEventSeen = true;
      applySession(session, event === "USER_UPDATED");
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && !authEventSeen) applySession(session);
    }).catch(() => {
      if (mounted && !authEventSeen) applySession(null);
    });

    function handleRolesUpdated() {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (mounted) applySession(session, true);
      });
    }
    window.addEventListener("playtested-roles-updated", handleRolesUpdated);

    return () => {
      mounted = false;
      profileRequest++;
      subscription.unsubscribe();
      window.removeEventListener("playtested-roles-updated", handleRolesUpdated);
    };
  }, []);

  return (
    <HeaderAuthContext.Provider value={{ loggedIn, checkingSession, email, role, roles, testerRank, developerXp, profileLoaded }}>
      {children}
    </HeaderAuthContext.Provider>
  );
}

export default function SiteHeader() {
  const auth = useContext(HeaderAuthContext);
  if (!auth) throw new Error("SiteHeader must be inside SiteHeaderProvider");
  const { loggedIn, checkingSession, email, role, roles, testerRank, developerXp, profileLoaded } = auth;
  const journey = useSyncExternalStore(subscribeJourney, currentJourney, () => null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
  const navigationReady = !checkingSession && (!loggedIn || profileLoaded);
  const showRoleLinks = navigationReady && loggedIn;
  // Admin can always reach the developer and tester areas. Keep the header
  // stable even if a profile role list is temporarily incomplete; all page
  // and server-side permission checks still apply independently.
  const isAdmin = loggedIn && role === "admin";
  const canNavigateDeveloper = showRoleLinks && (isAdmin || roles.includes("developer"));
  const canNavigateTester = showRoleLinks && (isAdmin || roles.includes("tester"));
  const rankPresentation = testerRankPresentation(testerRank);
  const showTesterLevel = canNavigateTester && testerRank !== null;
  const showDeveloperLevel = canNavigateDeveloper;

  const allNavLinks = [
    ...navLinks,
    ...(canNavigateDeveloper ? [{ label: "Submit a Game", href: "/submit" }, { label: "My Games", href: "/my-submissions" }] : []),
    ...(canNavigateTester ? [{ label: "Tester Hub", href: carryJourney("/tester", journey) }] : []),
    ...(navigationReady && isAdmin ? [{ label: "Admin Review", href: "/admin/submissions" }] : []),
    ...(navigationReady && loggedIn ? [{ label: "Account", href: "/account" }] : []),
  ];

  const navLinkClass = "block rounded-md px-3 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.05] hover:text-white sm:py-2";

  return (
    <header className="relative z-40 border-b border-white/[0.08]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
        <Link href="/" className="shrink-0 font-[family-name:var(--font-display)] text-xl font-bold tracking-wider sm:text-2xl">
          PLAYTESTED<span className="text-[#77f29b]">_</span>
        </Link>

        <div className="flex min-w-0 max-w-full w-full flex-wrap items-center justify-end gap-1 sm:w-auto sm:gap-3">
          {!checkingSession && (loggedIn ? (
            <>
              <div className="hidden min-w-0 max-w-[520px] items-center gap-2 px-2 py-2 text-sm text-zinc-300 sm:inline-flex">
                <span className="mr-1 truncate">{email}</span>
                {showTesterLevel && <span className={`shrink-0 rounded-full border px-2 py-1 text-xs font-semibold ${rankPresentation.badge}`}>{rankPresentation.label}</span>}
                {showDeveloperLevel && <span className="shrink-0 rounded-full border border-[#77f29b]/30 bg-[#77f29b]/10 px-2 py-1 text-xs font-semibold text-[#77f29b]">Developer Lv. {developerLevel}</span>}
              </div>

              <NotificationBell />

              <button type="button" onClick={handleLogout} className="rounded-md border border-white/15 px-3 py-2 text-xs text-zinc-300 transition hover:border-white/30 hover:text-white sm:text-sm">Log out</button>
            </>
          ) : (
            <>
              <a href={journey ? "/login?next=" + encodeURIComponent(window.location.pathname + window.location.search) : "/login"} className="rounded-md px-2 py-2 text-sm text-zinc-300 transition hover:text-white">Log in</a>
              <a href={journey ? "/login?mode=signup&next=" + encodeURIComponent(window.location.pathname + window.location.search) : "/login?mode=signup"} className="rounded-md bg-[#77f29b] px-3 py-2 text-sm font-semibold text-[#09100b] transition hover:bg-[#9af8b4]">Sign up</a>
            </>
          ))}

          <button type="button" aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation" onClick={() => setMobileMenuOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-sm text-white transition hover:border-[#77f29b]/50 sm:hidden">
            <span>{mobileMenuOpen ? "Close" : "Menu"}</span><span aria-hidden="true">{mobileMenuOpen ? "×" : "☰"}</span>
          </button>
        </div>
      </div>

      <nav aria-label="Main navigation" aria-busy={!navigationReady} className="mx-auto hidden min-h-[42px] max-w-7xl flex-wrap gap-x-6 gap-y-2 px-6 pb-4 text-sm text-zinc-400 sm:flex">
        {navigationReady
          ? allNavLinks.map((link) => <Link key={link.href} href={link.href} prefetch={false} className="shrink-0 transition hover:text-white">{link.label}</Link>)
          : <span className="sr-only">Loading navigation</span>}
      </nav>

      {mobileMenuOpen && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="border-t border-white/[0.08] bg-[#0e110f] px-4 py-3 sm:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navigationReady ? allNavLinks.map((link) => <Link key={link.href} href={link.href} prefetch={false} onClick={() => setMobileMenuOpen(false)} className={navLinkClass}>{link.label}</Link>) : <p className="px-3 py-2 text-sm text-zinc-500">Loading navigation…</p>}
            {loggedIn && (
              <div className="mt-2 border-t border-white/10 px-3 pt-3">
                <p className="truncate text-xs text-zinc-400">{email}</p>
                <div className="mt-2 flex flex-col gap-1">
                  {showTesterLevel && <p className={`self-start rounded-full border px-2 py-1 text-xs ${rankPresentation.badge}`}>{rankPresentation.label}</p>}
                  {showDeveloperLevel && <p className="text-xs text-[#77f29b]">Developer level: {developerLevel}</p>}
                </div>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
