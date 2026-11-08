export type Platform = "steam" | "pc" | "browser" | "roblox" | "android" | "ios";

import type { ReactNode } from "react";

export const PLATFORMS: readonly Platform[] = [
  "steam",
  "pc",
  "browser",
  "roblox",
  "android",
  "ios",
];

// Browser → Web, Roblox → Roblox, Android/iOS → Mobile, Steam/PC → none.
// Android and iOS remain distinct values internally for tester eligibility.
export const PLATFORM_BADGE: Record<Platform, "Web" | "Roblox" | "Mobile" | null> = {
  steam: null,
  pc: null,
  browser: "Web",
  roblox: "Roblox",
  android: "Mobile",
  ios: "Mobile",
};

export function platformBadge(platform: Platform | null | undefined): "Web" | "Roblox" | "Mobile" | null {
  if (!platform) return null;
  return PLATFORM_BADGE[platform] ?? null;
}

export interface PlatformInfo {
  value: Platform;
  label: string;
  linkLabel: string;
  linkPlaceholder: string;
  linkGuidance: string;
  icon: ReactNode;
}

function svg(path: string, label: string): ReactNode {
  return (
    <svg
      role="img"
      aria-label={label}
      className="shrink-0"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {path}
    </svg>
  );
}

export const PLATFORM_INFO: Record<Platform, PlatformInfo> = {
  steam: {
    value: "steam",
    label: "Steam",
    linkLabel: "Steam store page",
    linkPlaceholder: "https://store.steampowered.com/app/...",
    linkGuidance:
      "Add the game's public Steam store page. Playtested matches Steam games by App ID to avoid duplicate listings.",
    icon: svg('<path d="M9 20l-4-4 4-4m4 8V8m0 0L6 4m6 12l4-4"/><path d="M22 12c0-4.714-3.824-8.57-8.57-8.57S5 7.286 5 12c0 4.714 3.824 8.57 8.57 8.57S22 16.714 22 12z" />', "Steam"),
  },
  pc: {
    value: "pc",
    label: "PC / Other",
    linkLabel: "External game or download page",
    linkPlaceholder: "https://...",
    linkGuidance:
      "Add a public page where testers can download or access the game (for example itch.io, a direct download or your own site).",
    icon: svg('<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M3 9l12 3-12 3"/>', "PC / Other"),
  },
  browser: {
    value: "browser",
    label: "Browser",
    linkLabel: "Playable URL",
    linkPlaceholder: "https://...",
    linkGuidance:
      "Add a playable HTTPS URL for the browser build. The link must use HTTPS.",
    icon: svg('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-1.4-1.41l-3 3a5 5 0 0 0-7.54-5.47l3-3a5 5 0 0 0 1.4 1.41z"/><circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>', "Browser"),
  },
  roblox: {
    value: "roblox",
    label: "Roblox",
    linkLabel: "Roblox experience URL",
    linkPlaceholder: "https://www.roblox.com/games/...",
    linkGuidance:
      "Add the Roblox experience URL (for example https://www.roblox.com/games/...).",
    icon: svg('<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>', "Roblox"),
  },
  android: {
    value: "android",
    label: "Android",
    linkLabel: "Google Play or Android URL",
    linkPlaceholder: "https://play.google.com/...",
    linkGuidance:
      "Add a Google Play or other supported Android game URL.",
    icon: svg('<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15c1.12-.22 2-.29 3-.29s1.88.08 3 .29v.02c-.13.58-.21 1.18-.21 1.79 0 4.08-3.05 7.44-7 7.93z"/><path d="M11 15h2v2h-2zM8.67 15.67c.1.24.28.49.51.8h.98c.23-.31.41-.56.51-.8s.21-.56.31-.87l-.32-.94c-.1-.3-.2-.58-.31-.87h-.98c-.23.31-.41.56-.51.8s-.21.57-.31.87l.32.94c.1.3.2.58.31.87zM15.33 15.67c-.1.24-.28.49-.51.8h-.98c-.23-.31-.41-.56-.51-.8s-.21-.56-.31-.87l.32-.94c.1-.3.2-.58.31-.87h.98c.23.31.41.56.51.8s.21.57.31.87l-.32.94c-.1.3-.2.58-.31.87zM11 10h2V8h-2zM8.67 10.67c.1.24.28.49.51.8h.98c.23-.31.41-.56.51-.8s.21-.56.31-.87l-.32-.94c-.1-.3-.2-.58-.31-.87h-.98c-.23.31-.41.56-.51.8s-.21.57-.31.87l.32.94c.1.3.2.58.31.87zM15.33 10.67c-.1.24-.28.49-.51.8h-.98c-.23-.31-.41-.56-.51-.8s-.21-.56-.31-.87l.32-.94c.1-.3.2-.58.31-.87h.98c.23.31.41.56.51.8s.21.57.31.87l-.32.94c-.1.3-.2.58-.31.87z"/>', "Android"),
  },
  ios: {
    value: "ios",
    label: "iPhone / iPad",
    linkLabel: "App Store or iOS URL",
    linkPlaceholder: "https://apps.apple.com/...",
    linkGuidance:
      "Add an App Store or other supported iOS game URL.",
    icon: svg('<rect width="16" height="16" x="4" y="4" rx="4" ry="4"/><path d="M10 8h4v4h-4z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>', "iPhone / iPad"),
  },
};

export function platformLinkError(platform: Platform | null, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "Enter a valid URL.";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "Use a valid HTTP or HTTPS URL.";
  switch (platform) {
    case "steam":
      if (url.protocol !== "https:") return "Use an HTTPS link.";
      if (
        url.hostname !== "store.steampowered.com" &&
        url.hostname !== "www.store.steampowered.com"
      )
        return "Use a Steam store URL (store.steampowered.com).";
      if (!/^\/app\/\d+/.test(url.pathname))
        return "Use the game's main Steam store page.";
      return null;
    case "pc":
      return null;
    case "browser":
      if (url.protocol !== "https:") return "Use an HTTPS link.";
      return null;
    case "roblox": {
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      if (url.protocol !== "https:") return "Use an HTTPS link.";
      if (!host.endsWith("roblox.com")) return "Use a Roblox experience URL.";
      return null;
    }
    case "android": {
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      if (url.protocol !== "https:") return "Use an HTTPS link.";
      if (
        !host.endsWith("play.google.com") &&
        !host.endsWith("android.com") &&
        host !== "play.google.com"
      )
        return "Use a Google Play or supported Android game URL.";
      return null;
    }
    case "ios": {
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      if (url.protocol !== "https:") return "Use an HTTPS link.";
      if (!host.endsWith("apple.com")) return "Use an App Store or supported iOS URL.";
      return null;
    }
  }
  return null;
}

export function platformLinkValue(platform: Platform | null, formData: FormData): { steamUrl: string | null; gameLink: string | null } {
  const steamUrl = String(formData.get("steamUrl") ?? "").trim();
  const gameLink = String(formData.get("gameLink") ?? "").trim();
  if (platform === "steam") return { steamUrl: steamUrl || null, gameLink: null };
  return { steamUrl: null, gameLink: gameLink || null };
}

export function platformOf(value: unknown): Platform | null {
  if (typeof value === "string" && PLATFORMS.includes(value as Platform))
    return value as Platform;
  return null;
}

export function legacyPlatform(value: unknown): Platform {
  return platformOf(value) ?? "steam";
}
