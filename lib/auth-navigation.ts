// Shared by sign-in and the confirmation callback. Never accept another origin.
export function getSafeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(decoded)) return "/";
    const url = new URL(value, "https://playtested.invalid");
    if (url.origin !== "https://playtested.invalid") return "/";
    return url.pathname + url.search + url.hash;
  } catch { return "/"; }
}

export function authDestination(path: string): string {
  if (path === "/tester" || path.startsWith("/tester?")) return "Tester Hub";
  if (path === "/my-submissions" || path.startsWith("/my-submissions?")) return "My Games";
  if (path === "/submit" || path.startsWith("/submit?")) return "adding your game";
  if (path.startsWith("/playtest/")) return "your community playtest";
  if (path === "/") return "the game catalogue";
  return "your requested page";
}

export function confirmationFailurePath(next: string): string {
  const params = new URLSearchParams({error:"auth_callback_failed"});
  const safe = getSafeNextPath(next);
  if (safe !== "/") params.set("next",safe);
  return `/login?${params}`;
}
