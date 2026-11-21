"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import { createClient } from "../../../lib/supabase";

type DeleteState = "checking" | "ready" | "deleting" | "error";

export default function DeleteAccountPage() {
  const [state, setState] = useState<DeleteState>("checking");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data, error: userError } = await supabase.auth.getUser();

      if (userError || !data.user) {
        window.location.href = "/login?next=/account/delete";
        return;
      }

      setState("ready");
    }

    void load();
  }, []);

  async function deleteAccount() {
    if (confirmation !== "DELETE" || state === "deleting") {
      return;
    }

    const confirmed = window.confirm(
      "Permanently delete your Playtested account? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setState("deleting");
    setError("");

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmation: "DELETE",
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | { deleted?: boolean; error?: string }
        | null;

      if (!response.ok || !result?.deleted) {
        setError(
          result?.error ??
            "Your account could not be deleted. No further action was taken."
        );
        setState("error");
        return;
      }

      // The Auth identity has already been removed server-side.
      // Clear any remaining browser-side Supabase session state.
      const supabase = createClient();

      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // The server has already deleted the account.
        // Failure to clear an already-invalid local session must not
        // turn a successful deletion into an apparent failure.
      }

      window.location.replace("/?accountDeleted=1");
    } catch {
      setError(
        "We could not complete your account deletion. Please try again."
      );
      setState("error");
    }
  }

  const busy = state === "deleting";

  return (
    <main className="min-h-screen bg-[#090b0a] text-white">
      <SiteHeader />

      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">
          Account settings
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Delete your account
        </h1>

        <div className="mt-8 rounded-2xl border border-red-400/25 bg-[#0d110f] p-6 sm:p-8">
          {state === "checking" ? (
            <p className="text-sm text-zinc-400">
              Checking your account...
            </p>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-red-300">
                Permanently delete your Playtested account
              </h2>

              <p className="mt-3 leading-7 text-zinc-300">
                Deleting your account removes your sign-in identity and
                account-specific personal data from Playtested.
              </p>

              <p className="mt-3 leading-7 text-zinc-300">
                Unfinished testing activity will be released. Completed
                playtest, game and verification records may be retained in a
                de-identified form where they are needed to preserve existing
                testing results and service integrity.
              </p>

              <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/5 p-4">
                <p className="text-sm font-semibold text-red-200">
                  This action cannot be undone.
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  You will lose access to this account after deletion. If you
                  later return to Playtested, you will need to create a new
                  account.
                </p>
              </div>

              <label className="mt-6 block text-sm font-semibold text-zinc-200">
                Type{" "}
                <span className="font-mono text-red-300">DELETE</span>{" "}
                to confirm

                <input
                  value={confirmation}
                  onChange={(event) => {
                    setConfirmation(event.target.value);

                    if (state === "error") {
                      setState("ready");
                      setError("");
                    }
                  }}
                  disabled={busy}
                  autoComplete="off"
                  spellCheck={false}
                  className="mt-2 w-full rounded-lg border border-white/15 bg-[#090b0a] px-4 py-3 text-white outline-none focus:border-red-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>

              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-red-400/20 bg-red-500/5 px-4 py-3 text-sm text-red-300"
                >
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={deleteAccount}
                disabled={confirmation !== "DELETE" || busy}
                className="mt-5 rounded-lg bg-red-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy
                  ? "Deleting account..."
                  : "Permanently delete account"}
              </button>

              <p className="mt-4 text-xs leading-5 text-zinc-500">
                You will be asked for one final confirmation before deletion
                begins.
              </p>
            </>
          )}
        </div>

        {!busy && (
          <Link
            href="/account"
            className="mt-6 inline-block text-sm font-semibold text-[#77f29b] hover:underline"
          >
            Back to your account
          </Link>
        )}
      </div>
    </main>
  );
}