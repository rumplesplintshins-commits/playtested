"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export default function SubmitNextSteps() {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const headings = Array.from(document.querySelectorAll("h3"));
    const oldHeading = headings.find(
      (heading) => heading.textContent?.trim() === "What happens next?"
    );
    const oldPanel = oldHeading?.parentElement as HTMLElement | null;

    if (oldPanel) oldPanel.style.display = "none";

    const buttons = Array.from(document.querySelectorAll("button"));
    const submitButton = buttons.find(
      (button) => button.textContent?.trim() === "Submit application"
    );

    if (!submitButton?.parentElement) {
      return () => {
        if (oldPanel) oldPanel.style.display = "";
      };
    }

    const mount = document.createElement("div");
    mount.dataset.submitNextSteps = "true";
    mount.className = "w-full";
    submitButton.parentElement.insertBefore(mount, submitButton);
    setTarget(mount);

    return () => {
      setTarget(null);
      mount.remove();
      if (oldPanel) oldPanel.style.display = "";
    };
  }, []);

  if (!target) return null;

  const steps = [
    [
      "01",
      "Submit your game",
      "Add your game details and submit them to Playtested for approval.",
    ],
    [
      "02",
      "Get approved",
      "Once approved, your game appears in the catalogue and in My Games.",
    ],
    [
      "03",
      "Start a playtest",
      "Open the game in My Games and select Start Playtest to set up your playtest campaign.",
    ],
  ] as const;

  return createPortal(
    <div className="mb-6 rounded-2xl border border-[#77f29b]/20 bg-[#0d120f] p-4 shadow-xl shadow-black/20 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#77f29b]">
            HOW IT WORKS
          </p>
          <h2 className="mt-1 text-lg font-bold text-white">
            From submission to playtest
          </h2>
        </div>
        <p className="text-xs text-zinc-500">Three simple steps</p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {steps.map(([number, title, description], index) => (
          <div
            key={number}
            className="relative rounded-xl border border-white/10 bg-black/20 p-4"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#77f29b]/30 bg-[#77f29b]/10 font-mono text-xs font-bold text-[#77f29b]">
                {number}
              </span>
              <h3 className="font-semibold text-zinc-100">{title}</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
            {index < 2 && (
              <span className="absolute -right-[11px] top-1/2 z-10 hidden -translate-y-1/2 bg-[#0d120f] px-1 font-mono text-sm text-[#77f29b]/50 md:block">
                →
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-3 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">
        <span className="mt-0.5 text-[#77f29b]">✓</span>
        <p className="text-xs leading-5 text-zinc-400">
          <strong className="font-semibold text-zinc-200">
            Submitting your game doesn’t automatically start a playtest.
          </strong>{" "}
          You’ll create your playtest campaign after the game has been approved.
        </p>
      </div>
    </div>,
    target
  );
}
