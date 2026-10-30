"use client";

import { createClient } from "../../lib/supabase";
import { getSafeNextPath } from "../../lib/auth-navigation";

type SignupRole = "player" | "tester" | "developer";

type Props = {
  mode: "login" | "signup";
  signupRoles: SignupRole[];
  nextPath: string;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setMessage: (message: string) => void;
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.37l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.92A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.92V7.46H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.54l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.62C7.18 7.71 9.39 5.95 12 5.95Z" />
    </svg>
  );
}

export default function GoogleSignInButton({
  mode,
  signupRoles,
  nextPath,
  loading,
  setLoading,
  setMessage,
}: Props) {
  async function signInWithGoogle() {
    if (loading) return;

    if (mode === "signup" && signupRoles.length === 0) {
      setMessage("Select at least one role to continue.");
      return;
    }

    setMessage("");
    setLoading(true);

    try {
      const supabase = createClient();
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      const safeNext = getSafeNextPath(nextPath);

      if (safeNext !== "/") {
        callbackUrl.searchParams.set("next", safeNext);
      }

      if (mode === "signup") {
        callbackUrl.searchParams.set("roles", signupRoles.join(","));
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (error) throw error;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Google sign-in could not be started. Please try again."
      );
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={loading}
        onClick={signInWithGoogle}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-600 bg-white px-4 py-3 font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon />
        {mode === "login" ? "Continue with Google" : "Create account with Google"}
      </button>

      <div className="flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-slate-700" />
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">or use email</span>
        <div className="h-px flex-1 bg-slate-700" />
      </div>
    </>
  );
}
