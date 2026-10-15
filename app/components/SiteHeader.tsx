
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Store", href: "/store" },
  { label: "Library", href: "/library" },
  { label: "Submit a Game", href: "/submit" },
];

const DEMO_ADMIN_BALANCE = 99999999.99;
const DEMO_USER_BALANCE = 0;

export default function SiteHeader() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [role, setRole] = useState("user");

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function loadRole(userId: string) {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (mounted) {
        setRole(error ? "user" : data?.role ?? "user");
      }
    }

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setLoggedIn(!!session);
      setCheckingSession(false);

      if (session?.user) {
        void loadRole(session.user.id);
      } else {
        setRole("user");
      }
    }

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      setLoggedIn(!!session);

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
        void loadRole(session.user.id);
      } else {
        setRole("user");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
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

  const demoBalance =
    role === "admin" ? DEMO_ADMIN_BALANCE : DEMO_USER_BALANCE;

  const formattedWallet = demoBalance.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  });

  return (
    <header className="border-b border-white/[0.08]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <a
          href="/"
          className="shrink-0 font-[family-name:var(--font-display)] text-2xl font-bold tracking-wider"
        >
          PLAYTESTED<span className="text-[#77f29b]">_</span>
        </a>

        <div className="flex flex-wrap items-center gap-3">
          {!checkingSession &&
            (loggedIn ? (
              <>
                <a
                  href="/account"
                  className="rounded-md px-2 py-2 text-sm text-zinc-300 transition hover:text-white"
                >
                  <span>Account</span>
                  <span className="ml-1 text-zinc-500">(Wallet: </span>
                  <span className="font-semibold text-[#77f29b]">
                    {formattedWallet}
                  </span>
                  <span className="text-zinc-500">)</span>
                </a>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md border border-white/15 px-3 py-2 text-sm text-zinc-300 transition hover:border-white/30 hover:text-white"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <a
                  href="/login"
                  className="px-2 py-2 text-sm text-zinc-300 transition hover:text-white"
                >
                  Log in
                </a>

                <a
                  href="/login?mode=signup"
                  className="rounded-md bg-[#77f29b] px-3 py-2 text-sm font-semibold text-[#09100b] transition hover:bg-[#9af8b4]"
                >
                  Sign up
                </a>
              </>
            ))}
        </div>
      </div>

      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-6 pb-4 text-sm text-zinc-400"
      >
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="shrink-0 transition hover:text-white"
          >
            {link.label}
          </a>
        ))}

        {!checkingSession && loggedIn && (
          <a
            href="/my-submissions"
            className="shrink-0 transition hover:text-white"
          >
            My Submissions
          </a>
        )}

        {!checkingSession && loggedIn && role === "admin" && (
          <a
            href="/admin/submissions"
            className="shrink-0 transition hover:text-white"
          >
            Admin Review
          </a>
        )}

        {!checkingSession && loggedIn && (
          <a
            href="/account"
            className="shrink-0 transition hover:text-white"
          >
            Account
          </a>
        )}
      </nav>
    </header>
  );
}