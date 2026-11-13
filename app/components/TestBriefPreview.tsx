"use client";

import { useId, useRef } from "react";

export default function TestBriefPreview({ instructions }: { instructions: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const text = instructions.trim() || "No additional testing instructions provided.";
  const compactText = text.replace(/\s+/g, " ");
  const characters = Array.from(compactText);
  const truncated = characters.length > 200;
  const preview = truncated ? `${characters.slice(0, 200).join("").trimEnd()}…` : compactText;

  return (
    <section aria-label="Test brief" className="mt-3 min-w-0 shrink-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Test brief</p>
      <div className="relative mt-2 h-20 overflow-hidden">
        <p className="line-clamp-4 max-h-20 overflow-hidden break-words text-sm leading-5 text-zinc-300 [overflow-wrap:anywhere]">{preview}</p>
        {truncated && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-t from-[#111512] to-transparent" />}
      </div>
      <button type="button" onClick={() => dialog.current?.showModal()} className="mt-2 rounded py-1 text-sm font-medium text-[#77f29b] underline underline-offset-4 hover:text-[#b9f9ca] focus-visible:outline-2 focus-visible:outline-[#77f29b]">
        Read full instructions
      </button>
      <dialog ref={dialog} aria-labelledby={headingId} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-[#111512] p-5 text-zinc-200 shadow-2xl backdrop:bg-black/75 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h4 id={headingId} className="text-lg font-semibold text-white">Developer instructions</h4>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close full test brief" className="shrink-0 rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/5">Close</button>
        </div>
        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{text}</p>
      </dialog>
    </section>
  );
}
