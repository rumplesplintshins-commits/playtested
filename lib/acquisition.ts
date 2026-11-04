// Restricted campaign labels only: never retain full URLs, query strings or free text.
export function campaignLabel(value: unknown): string | null {
  return typeof value === "string" && /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(value) ? value.toLowerCase() : null;
}
export const discoverySources = ["Reddit outreach", "Reddit post", "Organic search", "External referral", "Direct", "Other"] as const;
export type Acquisition = { source: string | null; medium: string | null; campaign: string | null; referral: string | null };
export function acquisitionContext(href: string, referrer: string): Acquisition {
  const url = new URL(href);
  let referral: string | null = null;
  try {
    const ref = new URL(referrer);
    if (ref.hostname !== url.hostname) {
      const host = ref.hostname.toLowerCase().replace(/^www\./, "");
      referral = /(^|\.)reddit\.com$/.test(host) ? "reddit" : /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com)$/.test(host) ? "search" : "external";
    }
  } catch { /* No referrer is normal. */ }
  return { source: campaignLabel(url.searchParams.get("utm_source")), medium: campaignLabel(url.searchParams.get("utm_medium")), campaign: campaignLabel(url.searchParams.get("utm_campaign")), referral };
}
export const analyticsPreferenceKey = "playtested.analytics.preference.v1";
export const analyticsSessionKey = "playtested.analytics.session.v1";
export function analyticsAllowed() {
  try {
    const value = JSON.parse(localStorage.getItem(analyticsPreferenceKey) || "null");
    return value?.allowed === true && typeof value.at === "number" && Date.now() - value.at < 180 * 86400000;
  } catch { return false; }
}
export function submissionAcquisition() {
  try {
    if (!analyticsAllowed() || navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return {};
    const session = JSON.parse(sessionStorage.getItem(analyticsSessionKey) || "null");
    if (!session || Date.now() - session.last > 30 * 60000) return {};
    return session.context || {};
  } catch { return {}; }
}
