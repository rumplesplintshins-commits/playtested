export type DevNotification = {
  id: number;
  kind: string;
  title: string;
  message: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
  localOnly: true;
};

const STORAGE_KEY = "playtested-dev-notifications-v3";
const BELL_HIDDEN_KEY = "playtested-bell-hidden-read-v2";
export const NOTIFICATIONS_CHANGED_EVENT = "playtested-notifications-changed";

function isLocalhost() {
  return typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function seed(): DevNotification[] {
  const now = Date.now();
  const samples = [
    ["New submission: Neon Harbour", "Neon Harbour has been submitted and is ready for review.", 4, false],
    ["Your feedback was marked as useful", "A developer found your playtest feedback helpful.", 18, false],
    ["New playtest available", "A new Action playtest matches your tester eligibility.", 37, false],
    ["More information requested", "A reviewer needs a little more information about your submission.", 75, false],
    ["Submission approved", "Your game has been approved for the Playtested catalogue.", 150, true],
    ["New submission: Paper Kingdom", "Paper Kingdom has been submitted and is ready for review.", 240, false],
    ["New playtest available", "A new Strategy playtest is available in the Tester Hub.", 360, true],
    ["Your feedback was marked as useful", "A developer found your detailed performance notes helpful.", 540, true],
    ["New submission: Hollow Signal", "Hollow Signal has been submitted and is ready for review.", 780, true],
    ["Submission approved", "Your latest game submission has been approved.", 1100, true],
    ["New playtest available", "A new Puzzle playtest matches your tester eligibility.", 1450, true],
    ["New submission: Tiny Orbit", "Tiny Orbit has been submitted and is ready for review.", 1900, true],
    ["More information requested", "A reviewer requested an updated build link and description.", 2500, true],
    ["Your feedback was marked as useful", "A developer found your feedback helpful and specific.", 3200, true],
    ["New playtest available", "A new RPG playtest is available in the Tester Hub.", 4100, true],
    ["Submission approved", "Your submission has passed review and is now approved.", 5200, true],
    ["New submission: Static Bloom", "Static Bloom has been submitted and is ready for review.", 6800, true],
    ["New playtest available", "A new simulation playtest matches your tester eligibility.", 8400, true],
    ["Your feedback was marked as useful", "A developer appreciated your clear bug reproduction steps.", 10100, true],
    ["New submission: Afterlight", "Afterlight has been submitted and is ready for review.", 12500, true],
    ["Submission approved", "Your game has been approved for the catalogue.", 15800, true],
    ["New playtest available", "A new adventure playtest is available to claim.", 20100, true],
    ["More information requested", "A reviewer needs clarification about your AI-use disclosure.", 26000, true],
    ["Your feedback was marked as useful", "A developer found your balancing feedback useful.", 33000, true],
  ] as const;

  return samples.map(([title, message, minutesAgo, read], index) => ({
    id: -(1000 + index + 1), kind: "local_test", title, message, href: null,
    read_at: read ? new Date(now - Number(minutesAgo) * 60000 + 30000).toISOString() : null,
    created_at: new Date(now - Number(minutesAgo) * 60000).toISOString(), localOnly: true,
  }));
}

export function getDevNotifications(): DevNotification[] {
  if (!isLocalhost()) return [];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as DevNotification[];
    const initial = seed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    window.localStorage.removeItem(BELL_HIDDEN_KEY);
    return initial;
  } catch { return seed(); }
}

export function saveDevNotifications(items: DevNotification[]) {
  if (!isLocalhost()) return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
}

export function notifyNotificationsChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
}

export function isDevNotification(id: number) { return id < 0; }
