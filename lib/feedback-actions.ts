export const FEEDBACK_ACTION_STATUSES = ["To investigate", "Planned", "Fixed", "Reviewed"] as const;
export type FeedbackActionStatus = typeof FEEDBACK_ACTION_STATUSES[number];
export type FeedbackActionReport = { id: string; source: string; date: string | null; enjoyed: string | null; frustration: string | null; improvement: string | null; bugs: string | null; testId?: string; testerNumber?: number };

export const FEEDBACK_ACTION_STORAGE_VERSION = 2;
export const FEEDBACK_ACTION_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;

type StoredFeedbackActions = {
  version: number;
  updatedAt: string;
  values: Record<string, FeedbackActionStatus>;
};

function validValues(value: unknown): Record<string, FeedbackActionStatus> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, status]) =>
      FEEDBACK_ACTION_STATUSES.includes(status as FeedbackActionStatus)
    )
  );
}

export function readFeedbackActions(raw: string | null, now = Date.now()): Record<string, FeedbackActionStatus> {
  try {
    const parsed: unknown = JSON.parse(raw || "{}");
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return {};

    const stored = parsed as Partial<StoredFeedbackActions>;
    if (stored.version !== FEEDBACK_ACTION_STORAGE_VERSION || typeof stored.updatedAt !== "string") {
      return {};
    }

    const updatedAt = Date.parse(stored.updatedAt);
    if (!Number.isFinite(updatedAt) || updatedAt > now + 5 * 60 * 1000 || now - updatedAt > FEEDBACK_ACTION_RETENTION_MS) {
      return {};
    }

    return validValues(stored.values);
  } catch {
    return {};
  }
}

export function writeFeedbackActions(values: Record<string, FeedbackActionStatus>) {
  return JSON.stringify({
    version: FEEDBACK_ACTION_STORAGE_VERSION,
    updatedAt: new Date().toISOString(),
    values: validValues(values),
  } satisfies StoredFeedbackActions);
}
