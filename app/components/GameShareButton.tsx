"use client";

import { useEffect, useRef, useState } from "react";

type Props = { title: string; path: string };

export default function GameShareButton({ title, path }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const canonicalUrl = `https://playtested.co.uk${path}`;

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${title} | Playtested`, url: canonicalUrl });
        setOpen(false);
        return;
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") return;
      }
    }
    setMessage("");
    setOpen((value) => !value);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setMessage("Game link copied");
    } catch {
      setMessage("Select and copy the link below");
    }
  }

  return (
    <div className="relative shrink-0" ref={root}>
      <button
        type="button"
        onClick={share}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#77f29b]/40 bg-[#77f29b]/[0.07] px-3 py-2 text-sm font-semibold text-[#a0f8b9] transition hover:border-[#77f29b]/75 hover:bg-[#77f29b]/[0.13] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#77f29b]"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16V3m0 0L7 8m5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>
        Share
      </button>
      {open && (
        <div role="dialog" aria-label={`Share ${title}`} className="absolute right-0 top-full z-30 mt-2 w-[min(19rem,85vw)] rounded-xl border border-white/15 bg-[#141a16] p-4 text-left shadow-2xl">
          <p className="text-sm font-bold text-white">Share this game</p>
          <p className="mt-1 truncate text-xs text-zinc-400">{title}</p>
          <input aria-label="Game link" readOnly value={canonicalUrl} onFocus={(event) => event.currentTarget.select()} className="mt-3 w-full rounded-md border border-white/15 bg-black/30 px-2 py-2 text-xs text-zinc-200" />
          <button type="button" onClick={copy} className="mt-3 w-full rounded-md bg-[#77f29b] px-3 py-2 text-sm font-bold text-black hover:bg-[#a0f8b9]">Copy game link</button>
          <p role="status" aria-live="polite" className="mt-2 min-h-4 text-xs text-[#a0f8b9]">{message}</p>
        </div>
      )}
    </div>
  );
}
