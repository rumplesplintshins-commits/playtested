"use client";

import type { FeedbackUsefulnessValue } from "./FeedbackUsefulness";

// Deliberately silent for unrated and Not useful reports.
export default function UsefulFeedbackBadge({ value }: { value?: FeedbackUsefulnessValue }) {
  if (value !== "useful") return null;
  return (
    <span aria-label="Developer marked this feedback useful"
      className="inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full border border-[#77f29b]/15 bg-[#77f29b]/[0.035] px-2 py-1 text-[11px] font-medium text-[#a2eab4]">
      <span aria-hidden="true">✓</span> Useful
    </span>
  );
}
