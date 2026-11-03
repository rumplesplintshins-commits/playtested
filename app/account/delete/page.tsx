"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import { createClient } from "../../../lib/supabase";

type RequestState = "checking" | "ready" | "submitting" | "requested";

export default function DeleteAccountPage() {
  const [state, setState] = useState<RequestState>("checking");
  const [confirmation, setConfirmation] = useState("");
  const [requestedAt, setRequestedAt] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        window.location.href = "/login?next=/account/delete";
        return;
      }

      const { data } = await supabase
        .from("account_deletion_requests")
        .select("requested_at,status")
        .in("status", ["pending", "processing"])
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setRequestedAt(data.requested_at);
        setState("requested");
      } else {
        setState("ready");
      }
    }

    void load();
  }, []);

  async function requestDeletion() {
    if (confirmation !== "DELETE") return;

    setState("submitting");
    setError("");

    const supabase = createClient();
    const { data, error: requestError } = await supabase.rpc(
      "request_account_deletion"
    );

    if (requestError) {
      setError(requestError.message || "Unable to submit the deletion request.");
      setState("ready");
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    setRequestedAt(result?.requested_at ?? new Date().toISOString());
    setState("requested");
  }

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
          {state === "checking" && (
            <p className="text-sm text-zinc-400">Checking your account...</p>
          )}

          {state === "requested" && (
            <>
              <h2 className="text-xl font-semibold">Deletion request received</h2>
              <p className="mt-3 leading-7 text-zinc-300">
                Your authenticated account-deletion request is recorded
                {requestedAt ? ` from ${new Date(requestedAt).toLocaleString()}` : ""}.
                Playtested will process the account and associated personal data in
                line with the Privacy Notice. Records that need to remain for service
                integrity, security or legal reasons will be removed from your account
                or de-identified where appropriate rather than kept unnecessarily linked
                to you.
              </p>
              <p className="mt-4 text-sm text-zinc-400">
                This request does not immediately sign you out or erase the account.
                That is deliberate while the deletion is processed safely.
              </p>
            </>
          )}

          {(state === "ready" || state === "submitting") && (
            <>
              <h2 className="text-xl font-semibold text-red-300">
                This is a serious request
              </h2>
              <p className="mt-3 leading-7 text-zinc-300">
                Requesting deletion starts the process of closing your Playtested
                account and removing or de-identifying personal data associated with it.
                Completed playtest and game records may need to remain in a de-identified
                form so existing results are not corrupted.
              </p>

              <label className="mt-6 block text-sm font-semibold text-zinc-200">
                Type <span className="font-mono text-red-300">DELETE</span> to confirm
                <input
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="off"
                  className="mt-2 w-full rounded-lg border border-white/15 bg-[#090b0a] px-4 py-3 text-white outline-none focus:border-red-400/60"
                />
              </label>

              {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

              <button
                type="button"
                onClick={requestDeletion}
                disabled={confirmation !== "DELETE" || state === "submitting"}
                className="mt-5 rounded-lg bg-red-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {state === "submitting" ? "Submitting..." : "Request account deletion"}
              </button>
            </>
          )}
        </div>

        <Link
          href="/account"
          className="mt-6 inline-block text-sm font-semibold text-[#77f29b] hover:underline"
        >
          Back to your account
        </Link>
      </div>
    </main>
  );
}
