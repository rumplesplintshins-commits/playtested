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
  // Render actual SVG elements, not a string containing markup (React escapes strings).
  // Steam and Roblox paths are the canonical Simple Icons brand SVG silhouettes; other icons are UI pictograms.
  const paths: Record<string, ReactNode> = {
    Steam: <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" fill="currentColor" stroke="none" />,
    "PC / Other": <><rect x="2" y="3" width="20" height="15" rx="2" /><path d="M8 22h8M12 18v4" /></>,
    Browser: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2c-3 3-4 6-4 10s1 7 4 10M12 2c3 3 4 6 4 10s-1 7-4 10" /></>,
    Roblox: <path d="M18.926 23.998 0 18.892 5.075.002 24 5.108ZM15.348 10.09l-5.282-1.453-1.414 5.273 5.282 1.453z" fill="currentColor" stroke="none" />,
    Android: <><path d="M5 10a7 7 0 0 1 14 0Z" fill="currentColor" stroke="none"/><rect x="5" y="11" width="14" height="8" rx="1.1" fill="currentColor" stroke="none"/><rect x="2" y="11" width="2.2" height="7" rx="1.1" fill="currentColor" stroke="none"/><rect x="19.8" y="11" width="2.2" height="7" rx="1.1" fill="currentColor" stroke="none"/><rect x="7.3" y="18" width="2.3" height="4.5" rx="1.15" fill="currentColor" stroke="none"/><rect x="14.4" y="18" width="2.3" height="4.5" rx="1.15" fill="currentColor" stroke="none"/><path d="M8.1 4.1 6.7 2M15.9 4.1 17.3 2" stroke="currentColor" strokeWidth="1.2"/><circle cx="9" cy="7.7" r=".7" fill="#101311" stroke="none"/><circle cx="15" cy="7.7" r=".7" fill="#101311" stroke="none"/></>,
    "iPhone / iPad": <><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M10 5h4M11 19h2" /></>,
  };
  void path;
  return <svg role="img" aria-label={label} className="shrink-0" width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">{paths[label]}</svg>;
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
