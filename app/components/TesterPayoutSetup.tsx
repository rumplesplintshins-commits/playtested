"use client";

import { useEffect, useState } from "react";

const countries = [
  ["GB","United Kingdom"],["US","United States"],["CA","Canada"],["AU","Australia"],
  ["NZ","New Zealand"],["IE","Ireland"],["DE","Germany"],["FR","France"],
  ["NL","Netherlands"],["ES","Spain"],["IT","Italy"],["PT","Portugal"],
  ["BE","Belgium"],["AT","Austria"],["CH","Switzerland"],["SE","Sweden"],
  ["NO","Norway"],["DK","Denmark"],["FI","Finland"],["PL","Poland"],
  ["CZ","Czechia"],["GR","Greece"],["RO","Romania"],["HU","Hungary"],
  ["JP","Japan"],["SG","Singapore"],["HK","Hong Kong"],["MY","Malaysia"],
  ["TH","Thailand"],["BR","Brazil"],["MX","Mexico"],
] as const;

export default function TesterPayoutSetup() {
  const [country, setCountry] = useState("GB");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"checking" | "not_connected" | "pending" | "active" | "unavailable">("checking");

  useEffect(() => {
    let active = true;
    void fetch("/api/tester-tips/connect/status", { cache: "no-store" })
      .then(async response => ({ response, data: await response.json().catch(() => ({})) }))
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) { setStatus("unavailable"); return; }
        if (!data.connected) { setStatus("not_connected"); return; }
        setStatus(data.transfersActive ? "active" : "pending");
      })
      .catch(() => { if (active) setStatus("unavailable"); });
    return () => { active = false; };
  }, []);

  async function startSetup() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/tester-tips/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.url !== "string") {
        throw new Error(typeof data.error === "string" ? data.error : "Unable to start payout setup.");
      }
      window.location.assign(data.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start payout setup.");
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-[#77f29b]/20 bg-[#0d110f] p-5 sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#77f29b]">Tester rewards</p>
      <h2 className="mt-2 text-lg font-semibold text-white">Set up tip payouts</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
        Connect a Stripe account to receive tips from developers when they find your accepted feedback particularly useful. Stripe securely collects your identity and bank details. Your personal details are not shown to the developer.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block w-full max-w-xs">
          <span className="mb-2 block text-xs font-medium text-zinc-400">Country for your Stripe account</span>
          <select value={country} onChange={event => setCountry(event.target.value)}
            disabled={busy}
            className="w-full rounded-lg border border-white/15 bg-[#090b0a] px-3 py-3 text-sm text-white outline-none focus:border-[#77f29b] disabled:opacity-60">
            {countries.map(([code,name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => void startSetup()} disabled={busy}
          className="rounded-lg bg-[#77f29b] px-5 py-3 text-sm font-bold text-[#071009] transition hover:bg-[#8af6a8] disabled:cursor-wait disabled:opacity-50">
          {busy ? "Opening Stripe..." : status === "pending" ? "Continue Stripe setup" : status === "active" ? "Manage Stripe details" : "Set up Stripe payouts"}
        </button>
      </div>
      {status === "active" && <p role="status" className="mt-3 text-sm text-[#77f29b]">Your Stripe account can receive tester tips.</p>}
      {status === "pending" && <p role="status" className="mt-3 text-sm text-amber-200">Stripe still needs information before your account can receive tips.</p>}
      {status === "checking" && <p className="mt-3 text-xs text-zinc-500">Checking Stripe account status...</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      <p className="mt-3 text-xs leading-5 text-zinc-500">Stripe determines eligibility and payout timing. You must complete its verification before tips can be sent.</p>
    </section>
  );
}
