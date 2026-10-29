export const FEEDBACK_ACTION_STATUSES = ["To investigate", "Planned", "Fixed", "Reviewed"] as const;
export type FeedbackActionStatus = typeof FEEDBACK_ACTION_STATUSES[number];
export type FeedbackActionReport = { id: string; source: string; date: string | null; enjoyed: string | null; frustration: string | null; improvement: string | null; bugs: string | null };
export function readFeedbackActions(raw: string | null): Record<string, FeedbackActionStatus> {
  try {
    const parsed: unknown = JSON.parse(raw || "{}");
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return {};
    return Object.fromEntries(Object.entries(parsed).filter(([,value])=>FEEDBACK_ACTION_STATUSES.includes(value as FeedbackActionStatus)));
  } catch { return {}; }
}
