"use client";

import { useEffect } from "react";

const FEEDBACK_DRAFT_PREFIX = "playtested:feedback-draft:v1:";
const FEEDBACK_DRAFT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export default function PrivacyStorageMaintenance() {
  useEffect(() => {
    try {
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (!key?.startsWith(FEEDBACK_DRAFT_PREFIX)) continue;

        const raw = window.localStorage.getItem(key);
        if (!raw) {
          expiredKeys.push(key);
          continue;
        }

        try {
          const saved = JSON.parse(raw) as { updatedAt?: unknown };
          const updatedAt =
            typeof saved.updatedAt === "string"
              ? Date.parse(saved.updatedAt)
              : Number.NaN;

          if (
            !Number.isFinite(updatedAt) ||
            updatedAt > now + 5 * 60 * 1000 ||
            now - updatedAt > FEEDBACK_DRAFT_RETENTION_MS
          ) {
            expiredKeys.push(key);
          }
        } catch {
          expiredKeys.push(key);
        }
      }

      for (const key of expiredKeys) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Storage may be unavailable or blocked. The application remains usable;
      // the browser/user can still clear site data manually.
    }
  }, []);

  return null;
}
