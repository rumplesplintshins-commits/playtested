// Restricted campaign labels only: never retain full URLs, query strings or free text.
export function campaignLabel(value: unknown): string | null {
  return typeof value === "string" && /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(value) ? value.toLowerCase() : null;
}
export const discoverySources = ["Reddit outreach", "Reddit post", "Organic search", "External referral", "Direct", "Other"] as const;
export type Acquisition = { source: string | null; medium: string | null; campaign: string | null; referral: string | null };
// Only use recorded labels. A bare Reddit referral cannot identify a post or a DM.
export function capturedChannel(value:{source:string;medium?:string|null;campaign?:string|null;referral?:string|null}){
 const source=value.source.toLowerCase(),medium=value.medium?.toLowerCase()||"",campaign=value.campaign?.toLowerCase()||"";
 if(source==="reddit"){
  if(/^(outreach|dm|direct_message)$/.test(medium)||/^(reddit_)?(outreach|dm)(_|$)/.test(campaign))return "Direct Reddit outreach (captured label)";
  if(/^(post|subreddit|social)$/.test(medium)||/^(subreddit|reddit_post)(_|$)/.test(campaign))return "Subreddit post (captured label)";
  return "Reddit — placement unknown";
 }
 if(source==="search"||medium==="organic")return "Organic search (captured label/referral)";
 if(source==="external"||medium==="referral")return "External referral";
 if(["unknown","direct_or_unknown","direct"].includes(source))return "Direct / unknown";
 return "Other captured source";
}
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
export const analyticsNoticeVersion = "merge26-2026-11-05-v2";
export type AnalyticsPurpose = "pages" | "steam";
const deniedInThisTab = new Set<AnalyticsPurpose>();
export function purposeAllowed(purpose: AnalyticsPurpose) {
  if (deniedInThisTab.has(purpose)) return false;
  try {
    const value = JSON.parse(localStorage.getItem(analyticsPreferenceKey) || "null");
    const choice = value?.version === analyticsNoticeVersion ? value[purpose] : null;
    const age = Date.now() - choice?.at;
    return choice?.allowed === true && typeof choice.at === "number" && Number.isFinite(age) && age >= 0 && age < 180 * 86400000;
  } catch { return false; }
}
export function saveAnalyticsChoice(purpose: AnalyticsPurpose, allowed: boolean) {
  // A failed persistence write must never undo withdrawal in the current tab.
  if (!allowed) deniedInThisTab.add(purpose);
  if (purpose === "pages" && !allowed) { try { sessionStorage.removeItem(analyticsSessionKey); } catch { /* Collection remains off. */ } }
  let previous;
  try { previous = JSON.parse(localStorage.getItem(analyticsPreferenceKey) || "null"); } catch { /* Invalid preferences stay off. */ }
  const value: {version: string; pages?: {allowed: boolean; at: number}; steam?: {allowed: boolean; at: number}} = previous?.version === analyticsNoticeVersion
    ? {version: analyticsNoticeVersion, pages: previous.pages, steam: previous.steam} : { version: analyticsNoticeVersion };
  value[purpose] = { allowed, at: Date.now() };
  localStorage.setItem(analyticsPreferenceKey, JSON.stringify(value));
  if (allowed) deniedInThisTab.delete(purpose);
}
export function analyticsAllowed() {
  return purposeAllowed("pages");
}
export function submissionAcquisition() {
  try {
    if (!analyticsAllowed() || navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return {};
    const session = JSON.parse(sessionStorage.getItem(analyticsSessionKey) || "null");
    if (!session || Date.now() - session.last > 30 * 60000) return {};
    return session.context || {};
  } catch { return {}; }
}

// A previous general analytics choice is not silently extended to the new referral purpose.
export function steamReferralsAllowed(){return purposeAllowed("steam");}
