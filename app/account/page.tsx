
"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [walletError, setWalletError] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function loadAccount() {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        window.location.href = "/login";
        return;
      }

      setEmail(userData.user.email ?? "");

      const { error } = await supabase
        .from("wallets")
        .select("balance_pence")
        .eq("user_id", userData.user.id)
        .single();

      if (error) {
        setWalletError("Unable to load your wallet.");
      }

      setLoading(false);
    }

    loadAccount();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
          Playtested account
        </p>

        <h1 className="mt-3 text-4xl font-bold">Your account</h1>

        {loading ? (
          <p className="mt-6 text-zinc-400">Loading account...</p>
        ) : (
          <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-6">
            <p className="text-sm text-zinc-400">Signed in as</p>
            <p className="mt-2 break-all text-lg">{email}</p>

            <div className="mt-8 border-t border-white/10 pt-6">
              <h2 className="text-xl font-semibold">Wallet</h2>

              {walletError ? (
                <p className="mt-4 text-sm text-red-400">
                  {walletError}
                </p>
              ) : (
                <>
                  <p className="mt-4 text-4xl font-bold text-emerald-400">
                    £99,999,999.99
                  </p>

                  <p className="mt-2 text-sm text-emerald-400">
                    Founder balance · Demo
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Demo display only. This is not real money.
                    Wallet transactions are not yet implemented.
                  </p>
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}