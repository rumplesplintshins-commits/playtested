"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createClient } from "../../lib/supabase";
import { isDisposableEmail } from "../../lib/disposable-email";
import { authDestination, getSafeNextPath } from "../../lib/auth-navigation";
import Link from "next/link";
import GoogleSignInButton from "./GoogleSignInButton";

type SignupRole = "player" | "tester" | "developer";

const roleOptions: { value: SignupRole; label: string; description: string }[] = [
  { value: "player", label: "Player", description: "Discover Games" },
  { value: "tester", label: "Tester", description: "Playtest Games and Earn XP" },
  { value: "developer", label: "Game Developer", description: "Submit and Manage Games" },
];

function isSignupRole(value: string | null): value is SignupRole {
  return value === "player" || value === "tester" || value === "developer";
}

const subscribeToHydration = () => () => {};
const clientHydrationSnapshot = () => true;
const serverHydrationSnapshot = () => false;
const resendCooldownSeconds = 60;

function confirmationCallback(nextPath: string) {
  const url = new URL("/auth/callback", window.location.origin);
  if (nextPath !== "/") url.searchParams.set("next", nextPath);
  return url.toString();
}

function SignupConfirmation({ email, nextPath }: { email: string; nextPath: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const sending = useRef(false);
  const [deadline, setDeadline] = useState(() => Date.now() + resendCooldownSeconds * 1000);
  const [remaining, setRemaining] = useState(resendCooldownSeconds);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [deadline]);

  async function resend() {
    if (sending.current || Date.now() < deadline) return;
    sending.current = true;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const { error } = await createClient().auth.resend({
        type: "signup", email, options: { emailRedirectTo: confirmationCallback(nextPath) },
      });
      if (error?.status === 429) {
        setError("Too many requests. Wait before trying again.");
      } else if (error) {
        throw error;
      } else {
        setNotice("Confirmation requested. Check your inbox for the latest email.");
      }
    } catch {
      setError("Could not resend the confirmation email. Please try again shortly.");
    } finally {
      setDeadline(Date.now() + resendCooldownSeconds * 1000);
      setRemaining(resendCooldownSeconds);
      sending.current = false;
      setBusy(false);
    }
  }

  const signIn = nextPath === "/" ? "/login" : `/login?${new URLSearchParams({ next: nextPath })}`;
  return <section className="space-y-4 text-center">
    <span aria-hidden="true" className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-400/15 text-4xl text-emerald-300">✓</span>
    <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold">Check your email</h1>
    <p className="text-sm leading-6 text-slate-300">Look for a confirmation email at <strong className="[overflow-wrap:anywhere] text-white">{email}</strong>. Verify your email before signing in.</p>
    <p className="text-sm text-slate-300">Check your spam or junk folder if you can’t find it.</p>
    <button type="button" onClick={() => void resend()} disabled={busy || remaining > 0} className="w-full rounded-lg border border-emerald-400/40 px-3 py-3 text-sm font-semibold text-emerald-300 disabled:opacity-60">{busy ? "Sending…" : remaining > 0 ? `Resend confirmation in ${remaining}s` : "Resend confirmation email"}</button>
    {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
    {error && <p role="alert" className="text-sm text-amber-200">{error}</p>}
    <a href={signIn} className="inline-block text-sm font-semibold text-emerald-300 underline underline-offset-4">Back to sign in</a>
  </section>;
}

export default function LoginPage() {
  // Match the server HTML on the first client render, then initialise from the
  // browser URL exactly once. Mode switches keep their existing form state.
  const hydrated = useSyncExternalStore(subscribeToHydration, clientHydrationSnapshot, serverHydrationSnapshot);
  return <LoginForm key={hydrated ? "browser" : "server"} initialSearch={hydrated ? window.location.search : ""} />;
}

function LoginForm({initialSearch}: {initialSearch: string}) {
  const [initialUrlState] = useState<{ mode: "login" | "signup"; nextPath: string; confirmationFailed: boolean; ageConfirmationRequired: boolean; signupRoles: SignupRole[] }>(() => {
    const params = new URLSearchParams(initialSearch);
    const urlMode = params.get("mode") === "signup" ? "signup" : "login";
    const urlRole = params.get("role");
    const urlNext = getSafeNextPath(params.get("next"));
    const urlError = params.get("error");
    return {
      mode: urlError === "age_confirmation_required" ? "signup" : urlMode,
      nextPath: urlNext,
      confirmationFailed: urlError === "auth_callback_failed",
      ageConfirmationRequired: urlError === "age_confirmation_required",
      signupRoles: urlMode === "signup" && isSignupRole(urlRole) ? [urlRole] : ["player"],
    };
  });

  const [mode, setMode] = useState<"login" | "signup">(initialUrlState.mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupRoles, setSignupRoles] = useState<SignupRole[]>(initialUrlState.signupRoles);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [nextPath] = useState(initialUrlState.nextPath);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const submitting = useRef(false);
  const [confirmationFailed, setConfirmationFailed] = useState(initialUrlState.confirmationFailed);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState("");
  const recoveryInFlight = useRef(false);
  const lastRecoveryRequest = useRef(0);
  const [ageConfirmationRequired, setAgeConfirmationRequired] = useState(initialUrlState.ageConfirmationRequired);

  function toggleRole(role: SignupRole) {
    setSignupRoles((current) => current.includes(role) ? current.filter((item) => item !== role) : [...current, role]);
  }

  function switchMode() {
    const nextMode = mode === "login" ? "signup" : "login";
    setMode(nextMode);
    setMessage("");
    setAgeConfirmed(false);
    setAgeConfirmationRequired(false);
    setConfirmationFailed(false);

    const params = new URLSearchParams();
    if (nextMode === "signup") {
      params.set("mode", "signup");
      if (signupRoles.length === 1) params.set("role", signupRoles[0]);
    }
    if (nextPath !== "/") params.set("next", nextPath);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/login?${query}` : "/login");
  }

  async function resendRecoveryConfirmation() {
    if (recoveryInFlight.current) return;
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setRecoveryNotice("Enter the email address you registered with above first.");
      return;
    }
    if (Date.now() - lastRecoveryRequest.current < resendCooldownSeconds * 1000) {
      setRecoveryNotice("Please wait a minute before requesting another email.");
      return;
    }
    recoveryInFlight.current = true;
    setRecoveryBusy(true);
    setRecoveryNotice("");
    try {
      const { error } = await createClient().auth.resend({
        type: "signup", email: address, options: { emailRedirectTo: confirmationCallback(nextPath) },
      });
      if (error?.status === 429) {
        setRecoveryNotice("Too many requests. Please wait before trying again.");
      } else if (error) {
        setRecoveryNotice("Could not request a confirmation email. Please try again shortly.");
      } else {
        setRecoveryNotice("If your email still needs confirmation, check your inbox for the latest link.");
      }
    } catch {
      setRecoveryNotice("Could not request a confirmation email. Please try again shortly.");
    } finally {
      lastRecoveryRequest.current = Date.now();
      recoveryInFlight.current = false;
      setRecoveryBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || submitting.current) return;
    setMessage("");
    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "signup" && signupRoles.length === 0) {
      setMessage("Select at least one role to continue.");
      return;
    }
    if (mode === "signup" && !ageConfirmed) {
      setMessage("You must confirm that you are 18 or over to create a Playtested account.");
      return;
    }
    if (mode === "signup" && isDisposableEmail(normalizedEmail)) {
      setMessage("Please use a permanent email address. Temporary or disposable email services aren't supported.");
      return;
    }

    submitting.current = true;
    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const confirmedAt = new Date().toISOString();
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: confirmationCallback(nextPath),
            data: { signup_roles: signupRoles, age_18_confirmed: true, age_18_confirmed_at: confirmedAt },
          },
        });
        if (error) throw error;
        if (data.session) {
          window.location.replace(nextPath);
          return;
        }
        setPassword("");
        setConfirmationEmail(normalizedEmail);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        window.location.replace(nextPath);
      }
    } catch (error) {
      const emailUnconfirmed = error instanceof Error && /email not confirmed/i.test(error.message);
      if (emailUnconfirmed) {
        setConfirmationFailed(true);
        setMessage("Your email isn't confirmed yet. Use the resend confirmation option above.");
      } else {
        setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      }
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-white">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-2xl font-bold tracking-tight">Playtested<span className="text-emerald-400">.</span></Link>
        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-8">
          {confirmationEmail ? <SignupConfirmation email={confirmationEmail} nextPath={nextPath} /> : <>
          <h1 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-2 text-sm text-slate-400">{mode === "login" ? nextPath.startsWith("/playtest/") ? "Sign in to continue to this community playtest." : "Sign in to your Playtested account." : nextPath.startsWith("/playtest/") ? "Create your account to join this community playtest." : "Choose all the ways you want to use Playtested."}</p>

          {confirmationFailed && <div role="alert" className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100"><h2 className="font-semibold">That sign-in or confirmation link couldn&apos;t be used</h2><p className="mt-1">The link may have expired, been used already, or opened in a different browser. If you have confirmed your email, try signing in below.</p><p className="mt-2">If your email is still unconfirmed, enter your email address below and request a new confirmation link.</p><p className="mt-2 text-xs text-amber-100/80">Your saved destination: {nextPath === "/submit" || nextPath.startsWith("/submit?") ? "the game submission page" : authDestination(nextPath)}.</p></div>}
          {ageConfirmationRequired && <div role="alert" className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100"><h2 className="font-semibold">Age confirmation required</h2><p className="mt-1">Playtested accounts are for people aged 18 or over. Confirm your age below before continuing with Google.</p></div>}
          {nextPath !== "/" && !nextPath.startsWith("/playtest/") && <p className="mt-4 rounded-lg border border-slate-700 p-3 text-sm text-slate-300">After signing in, continue to {authDestination(nextPath)}. You can manage your roles in Account.</p>}
          {nextPath.startsWith("/playtest/") && <div className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4"><p className="text-sm font-semibold text-emerald-300">Community playtest invitation</p><p className="mt-1 text-xs leading-5 text-slate-400">After you sign in or confirm your new account, you&apos;ll return directly to the playtest.</p></div>}

          <form onSubmit={handleSubmit} aria-busy={loading} className="mt-8 space-y-5">
            {mode === "signup" && <fieldset className="space-y-3"><legend className="mb-3 text-sm font-medium">Your Roles</legend>{roleOptions.map((role) => { const checked = signupRoles.includes(role.value); return <label key={role.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${checked ? "border-emerald-400 bg-emerald-400/5" : "border-slate-700 hover:border-slate-500"}`}><input type="checkbox" disabled={loading} checked={checked} onChange={() => toggleRole(role.value)} className="mt-1 h-4 w-4 accent-emerald-400"/><span className="block text-sm font-semibold">{role.label} - {role.description}</span></label>; })}<p className="text-xs text-slate-500">Select one, two or all three roles. You can take part in multiple areas of Playtested.</p></fieldset>}

            {mode === "signup" && <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700 bg-slate-950/40 p-4"><input type="checkbox" required disabled={loading} checked={ageConfirmed} onChange={(e) => { setAgeConfirmed(e.target.checked); setMessage(""); }} className="mt-1 h-4 w-4 accent-emerald-400"/><span className="text-sm leading-6 text-slate-300">I confirm that I am <strong className="text-white">18 or over</strong> and agree to the <Link href="/terms" className="text-emerald-300 underline underline-offset-4">Terms</Link> and acknowledge the <Link href="/privacy" className="text-emerald-300 underline underline-offset-4">Privacy Notice</Link>.</span></label>}

            <GoogleSignInButton mode={mode} signupRoles={signupRoles} ageConfirmed={ageConfirmed} nextPath={nextPath} loading={loading} setLoading={setLoading} setMessage={setMessage}/>

            <div><label htmlFor="email" className="mb-2 block text-sm font-medium">Email address</label><input id="email" disabled={loading} type="email" autoComplete="email" required value={email} onChange={(e) => { setEmail(e.target.value); setMessage(""); }} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="you@example.com"/></div>
            {mode === "login" && confirmationFailed && <div className="space-y-2">
              <button type="button" disabled={recoveryBusy || loading} onClick={() => void resendRecoveryConfirmation()} className="rounded-lg border border-emerald-400/35 px-3 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-400/10 disabled:opacity-60">{recoveryBusy ? "Requesting…" : "Resend confirmation email"}</button>
              {recoveryNotice && <p role="status" className="text-sm text-slate-300">{recoveryNotice}</p>}
            </div>}
            <div><label htmlFor="password" className="mb-2 block text-sm font-medium">Password</label><input id="password" disabled={loading} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(e) => { setPassword(e.target.value); setMessage(""); }} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-400" placeholder="At least 8 characters"/></div>
            {mode === "login" && <Link href="/forgot-password" className="block text-sm text-emerald-300 underline underline-offset-4">Forgot password?</Link>}
            {message && <p role="alert" className="rounded-lg bg-slate-800 p-3 text-sm text-slate-200">{message}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Please wait..." : mode === "login" ? nextPath.startsWith("/playtest/") ? "Sign in and continue" : "Sign in" : nextPath.startsWith("/playtest/") ? "Create account and join" : "Create account"}</button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-400">{mode === "login" ? "New to Playtested?" : "Already have an account?"}{" "}<button type="button" onClick={switchMode} disabled={loading} className="font-semibold text-emerald-400 hover:text-emerald-300">{mode === "login" ? "Create an account" : "Sign in"}</button></p>
          </>}
        </div>
      </div>
    </main>
  );
}
