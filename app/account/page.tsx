"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import { createClient } from "../../lib/supabase";

const availableRoles = [
  {
    id: "player",
    title: "Player",
    description: "Discover games, read reviews and build your library.",
    image: "/images/roles/player-role.png",
  },
  {
    id: "tester",
    title: "Tester",
    description: "Playtest games, submit feedback and earn XP.",
    image: "/images/roles/tester-role.png",
  },
  {
    id: "developer",
    title: "Game Developer",
    description: "Submit games, manage playtests and review feedback.",
    image: "/images/roles/developer-role.png",
  },
] as const;

type UserRole = (typeof availableRoles)[number]["id"];

function getLevelProgress(totalXp: number) {
  let level = 1;
  let remainingXp = Math.max(0, totalXp);

  while (true) {
    const requiredForNextLevel = 100 + (level - 1) * 50;

    if (remainingXp < requiredForNextLevel) {
      return {
        level,
        currentLevelXp: remainingXp,
        requiredForNextLevel,
      };
    }

    remainingXp -= requiredForNextLevel;
    level += 1;
  }
}

function AccountIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19c.8-3.3 3-5 6.5-5s5.7 1.7 6.5 5" />
    </svg>
  );
}

function RolesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3.5 19c.6-3.3 2.5-5 5.5-5s4.9 1.7 5.5 5" />
      <path d="M14 15c.8-.7 1.8-1 3-1 2.3 0 3.8 1.4 4.3 4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [roles, setRoles] = useState<UserRole[]>(["player"]);
  const [testerXp, setTesterXp] = useState(0);
  const [developerXp, setDeveloperXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
      setEmailVerified(Boolean(userData.user.email_confirmed_at));

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("roles, tester_xp, developer_xp")
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
        setTesterXp(profile?.tester_xp ?? 0);
        setDeveloperXp(profile?.developer_xp ?? 0);
      }

      setLoading(false);
    }

    void loadAccount();
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

  const testerProgress = getLevelProgress(testerXp);
  const developerProgress = getLevelProgress(developerXp);

  return (
    <main className="min-h-screen bg-[#090b0a] text-white">
      <SiteHeader />

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#77f29b]">
            Playtested account
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Your account
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
            Manage your account details and choose how you want to use
            Playtested.
          </p>
        </header>

        {loading ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-[#0d110f] p-7">
            <p className="text-sm text-zinc-500">Loading account...</p>
          </div>
        ) : (
          <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#0d110f] shadow-2xl shadow-black/20">
            <div className="p-5 sm:p-7">
              <div className="flex items-start gap-4 sm:gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#77f29b]/20 bg-[#77f29b]/10 text-[#77f29b]">
                  <AccountIcon />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold sm:text-xl">
                    Account information
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Your account details and sign-in information.
                  </p>

                  <div className="mt-5 flex flex-col gap-4 rounded-xl border border-white/10 bg-[#090b0a] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-500">
                        Email address
                      </p>

                      <p className="mt-1 break-all text-base font-medium text-zinc-100">
                        {email}
                      </p>
                    </div>

                    {emailVerified && (
                      <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-[#77f29b]/40 bg-[#77f29b]/10 px-3 py-1.5 text-xs font-semibold text-[#77f29b]">
                        <CheckIcon />
                        Verified
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="my-7 border-t border-white/10" />

              <div className="flex items-start gap-4 sm:gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#77f29b]/20 bg-[#77f29b]/10 text-[#77f29b]">
                  <RolesIcon />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold sm:text-xl">
                    Your roles
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    Choose the areas of Playtested you want to use. You can
                    change these selections at any time.
                  </p>

                  <div className="mt-5 space-y-3">
                    {availableRoles.map((role) => {
                      const selected = roles.includes(role.id);

                      const progression =
                        role.id === "tester"
                          ? testerProgress
                          : role.id === "developer"
                            ? developerProgress
                            : null;

                      const totalXp =
                        role.id === "tester"
                          ? testerXp
                          : role.id === "developer"
                            ? developerXp
                            : null;

                      return (
                        <label
                          key={role.id}
                          className={`group relative flex min-h-[126px] cursor-pointer items-center overflow-hidden rounded-xl border transition ${
                            selected
                              ? "border-[#77f29b]/35"
                              : "border-white/10 hover:border-white/20"
                          }`}
                        >
                          <div
                            className="absolute inset-0 bg-cover bg-center sm:bg-right"
                            style={{
                              backgroundImage: `url("${role.image}")`,
                            }}
                          />

                          <div className="absolute inset-0 bg-gradient-to-r from-[#090b0a] via-[#090b0a]/95 via-55% to-[#090b0a]/20" />

                          <div
                            className={`absolute inset-0 transition ${
                              selected
                                ? "bg-[#77f29b]/[0.03]"
                                : "bg-black/10 group-hover:bg-transparent"
                            }`}
                          />

                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleRole(role.id)}
                            className="sr-only"
                          />

                          <div className="relative z-10 flex items-center gap-4 px-5 py-5 sm:px-6">
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                                selected
                                  ? "border-[#77f29b] bg-[#77f29b] text-[#071009]"
                                  : "border-white/30 bg-black/40 text-transparent group-hover:border-white/50"
                              }`}
                            >
                              <CheckIcon />
                            </span>

                            <span className="min-w-0">
                              <span className="block text-base font-semibold text-white">
                                {role.title}
                              </span>

                              <span className="mt-1 block max-w-md text-sm leading-5 text-zinc-400">
                                {role.description}
                              </span>

                              {progression && totalXp !== null && (
                                <span className="mt-3 flex flex-wrap items-center gap-2">
                                  <span className="rounded-full border border-[#77f29b]/30 bg-[#77f29b]/10 px-2.5 py-1 text-xs font-semibold text-[#77f29b]">
                                    Level {progression.level}
                                  </span>

                                  <span className="text-xs font-medium text-zinc-300">
                                    {totalXp} XP
                                  </span>

                                  <span className="text-xs text-zinc-500">
                                    {progression.currentLevelXp}/
                                    {progression.requiredForNextLevel} XP to
                                    next level
                                  </span>
                                </span>
                              )}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={saveRoles}
                      disabled={saving}
                      className="rounded-lg bg-[#77f29b] px-5 py-3 text-sm font-bold text-[#071009] transition hover:bg-[#8af6a8] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save roles"}
                    </button>

                    {message && (
                      <p className="text-sm font-medium text-[#77f29b]">
                        {message}
                      </p>
                    )}

                    {errorMessage && (
                      <p className="break-words text-sm font-medium text-red-400">
                        {errorMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}