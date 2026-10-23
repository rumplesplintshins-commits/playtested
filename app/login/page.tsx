"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { isDisposableEmail } from "../../lib/disposable-email";

type SignupRole = "player" | "tester" | "developer";

const roleOptions: {
  value: SignupRole;
  label: string;
  description: string;
}[] = [
  {
    value: "player",
    label: "Player",
    description: "Discover Games",
  },
  {
    value: "tester",
    label: "Tester",
    description: "Playtest Games and Earn XP",
  },
  {
    value: "developer",
    label: "Game Developer",
    description: "Submit and Manage Games",
  },
];

function getSafeNextPath(value: string | null) {
  if (!value) {
    return "/";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function isSignupRole(value: string | null): value is SignupRole {
  return value === "player" || value === "tester" || value === "developer";
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupRoles, setSignupRoles] = useState<SignupRole[]>(["player"]);
  const [nextPath, setNextPath] = useState("/");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const requestedMode =
      params.get("mode") === "signup" ? "signup" : "login";

    const requestedRole = params.get("role");
    const requestedNext = getSafeNextPath(params.get("next"));

    setMode(requestedMode);
    setNextPath(requestedNext);

    if (requestedMode === "signup" && isSignupRole(requestedRole)) {
      setSignupRoles([requestedRole]);
    }
  }, []);

  function toggleRole(role: SignupRole) {
    setSignupRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role]
    );
  }

  function switchMode() {
    const nextMode = mode === "login" ? "signup" : "login";

    setMode(nextMode);
    setMessage("");

    const params = new URLSearchParams();

    if (nextMode === "signup") {
      params.set("mode", "signup");

      if (signupRoles.length === 1) {
        params.set("role", signupRoles[0]);
      }
    }

    if (nextPath !== "/") {
      params.set("next", nextPath);
    }

    const query = params.toString();

    window.history.replaceState(
      null,
      "",
      query ? `/login?${query}` : "/login"
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "signup" && signupRoles.length === 0) {
      setMessage("Select at least one role to continue.");
      return;
    }

    if (mode === "signup" && isDisposableEmail(normalizedEmail)) {
      setMessage(
        "Please use a permanent email address. Temporary or disposable email services aren't supported."
      );
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      if (mode === "signup") {
        const callbackUrl = new URL(
          "/auth/callback",
          window.location.origin
        );

        if (nextPath !== "/") {
          callbackUrl.searchParams.set("next", nextPath);
        }

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: callbackUrl.toString(),
            data: {
              signup_roles: signupRoles,
            },
          },
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          window.location.href = nextPath;
          return;
        }

        setMessage(
          nextPath !== "/"
            ? "Registration received. Check your email to confirm your account. After confirmation, you'll return to the playtest."
            : "Registration received. Check your email to confirm your account."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          throw error;
        }

        window.location.href = nextPath;
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-white">
      <div className="mx-auto max-w-md">
        <a href="/" className="text-2xl font-bold tracking-tight">
          Playtested<span className="text-emerald-400">.</span>
        </a>

        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-2xl font-bold">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            {mode === "login"
              ? nextPath.startsWith("/playtest/")
                ? "Sign in to continue to this community playtest."
                : "Sign in to your Playtested account."
              : nextPath.startsWith("/playtest/")
                ? "Create your account to join this community playtest."
                : "Choose all the ways you want to use Playtested."}
          </p>

          {nextPath.startsWith("/playtest/") && (
            <div className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4">
              <p className="text-sm font-semibold text-emerald-300">
                Community playtest invitation
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                After you sign in or confirm your new account, you'll return
                directly to the playtest.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {mode === "signup" && (
              <fieldset className="space-y-3">
                <legend className="mb-3 text-sm font-medium">
                  Your Roles
                </legend>

                {roleOptions.map((role) => {
                  const checked = signupRoles.includes(role.value);

                  return (
                    <label
                      key={role.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                        checked
                          ? "border-emerald-400 bg-emerald-400/5"
                          : "border-slate-700 hover:border-slate-500"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRole(role.value)}
                        className="mt-1 h-4 w-4 accent-emerald-400"
                      />

                      <span>
                        <span className="block text-sm font-semibold">
                          {role.label} - {role.description}
                        </span>
                      </span>
                    </label>
                  );
                })}

                <p className="text-xs text-slate-500">
                  Select one, two or all three roles. You can take part in
                  multiple areas of Playtested.
                </p>
              </fieldset>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setMessage("");
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={8}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setMessage("");
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400"
                placeholder="At least 8 characters"
              />
            </div>

            {message && (
              <p
                role="status"
                className="rounded-lg bg-slate-800 p-3 text-sm text-slate-200"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? nextPath.startsWith("/playtest/")
                    ? "Sign in and continue"
                    : "Sign in"
                  : nextPath.startsWith("/playtest/")
                    ? "Create account and join"
                    : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            {mode === "login"
              ? "New to Playtested?"
              : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={switchMode}
              className="font-semibold text-emerald-400 hover:text-emerald-300"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}