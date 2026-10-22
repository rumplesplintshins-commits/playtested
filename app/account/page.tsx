
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";

const availableRoles = [
  {
    id: "player",
    title: "Player",
    description: "Discover games and build your library.",
  },
  {
    id: "tester",
    title: "Tester",
    description: "Playtest games, submit feedback and earn XP.",
  },
  {
    id: "developer",
    title: "Game Developer",
    description: "Submit games and manage your submissions.",
  },
] as const;

type UserRole = (typeof availableRoles)[number]["id"];

export default function AccountPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<UserRole[]>(["player"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
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

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("roles")
        .eq("id", userData.user.id)
        .single();

      if (profileError) {
        setErrorMessage("Unable to load your account roles.");
      } else {
        const savedRoles = (profile?.roles ?? []).filter(
          (role: string): role is UserRole =>
            availableRoles.some((item) => item.id === role)
        );

        setRoles(savedRoles.length > 0 ? savedRoles : ["player"]);
      }

      const { error: walletLoadError } = await supabase
        .from("wallets")
        .select("balance_pence")
        .eq("user_id", userData.user.id)
        .single();

      if (walletLoadError) {
        setWalletError("Unable to load your wallet.");
      }

      setLoading(false);
    }

    loadAccount();
  }, []);

  function toggleRole(role: UserRole) {
    setRoles((currentRoles) => {
      if (currentRoles.includes(role)) {
        if (currentRoles.length === 1) {
          return currentRoles;
        }

        return currentRoles.filter((item) => item !== role);
      }

      return [...currentRoles, role];
    });

    setMessage("");
    setErrorMessage("");
  }

  async function saveRoles() {
    if (roles.length === 0) {
      setErrorMessage("Select at least one role.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const supabase = createClient();

    const { data, error } = await supabase.rpc("update_my_roles", {
      p_roles: roles,
    });

    if (error) {
      setErrorMessage(error.message || "Unable to save your roles.");
      setSaving(false);
      return;
    }

    const savedRoles = (data ?? []).filter(
      (role: string): role is UserRole =>
        availableRoles.some((item) => item.id === role)
    );

    setRoles(savedRoles);
    setMessage("Your roles have been saved.");
    setSaving(false);

    window.dispatchEvent(new Event("playtested-roles-updated"));
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-8 rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-emerald-400 hover:text-emerald-400"
        >
          ← Back to Home
        </button>

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
              <h2 className="text-xl font-semibold">Your roles</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Choose the areas of Playtested you want to use. You can
                change these selections at any time.
              </p>

              <div className="mt-5 space-y-3">
                {availableRoles.map((role) => (
                  <label
                    key={role.id}
                    className="flex cursor-pointer items-start gap-4 rounded-xl border border-white/10 bg-slate-950 p-4 hover:border-emerald-400/50"
                  >
                    <input
                      type="checkbox"
                      checked={roles.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                      className="mt-1 h-4 w-4 accent-emerald-400"
                    />

                    <span>
                      <span className="block font-semibold">
                        {role.title}
                      </span>
                      <span className="mt-1 block text-sm text-zinc-400">
                        {role.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={saveRoles}
                disabled={saving}
                className="mt-5 rounded-lg bg-emerald-400 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save roles"}
              </button>

              {message && (
                <p className="mt-4 text-sm text-emerald-400">{message}</p>
              )}

              {errorMessage && (
                <p className="mt-4 break-words text-sm text-red-400">
                  {errorMessage}
                </p>
              )}
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <h2 className="text-xl font-semibold">Wallet</h2>

              {walletError ? (
                <p className="mt-4 text-sm text-red-400">{walletError}</p>
              ) : (
                <>
                  <p className="mt-4 text-4xl font-bold text-emerald-400">
                    £99,999,999.99
                  </p>

                  <p className="mt-2 text-sm text-emerald-400">
                    Founder balance · Demo
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Demo display only. This is not real money. Wallet
                    transactions are not yet implemented.
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