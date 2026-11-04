"use client";
/* eslint-disable @next/next/no-img-element -- Browser-local previews and private no-store media must bypass the image optimizer. */
import { useEffect, useRef, useState } from "react";
import { validateScreenshot } from "@/lib/game-screenshots";

export default function ScreenshotPicker({ onChange, onBusyChange, disabled }: { onChange: (files: File[]) => void; onBusyChange: (busy: boolean) => void; disabled: boolean }) {
  const [entries, setEntries] = useState<{ file: File; url: string }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const urls = useRef(new Set<string>());
  const active = useRef(true);
  useEffect(() => { active.current = true; const current = urls.current; return () => { active.current = false; for (const url of current) URL.revokeObjectURL(url); onBusyChange(false); }; }, [onBusyChange]);
  async function choose(files: File[]) {
    if (!files.length) return;
    if (files.length + entries.length > 5) { setError("Choose up to five screenshots per game."); return; }
    setBusy(true); onBusyChange(true); setError("");
    try {
      for (const file of files) await validateScreenshot(file);
      if (!active.current) return;
      const next = [...entries, ...files.map(file => { const url = URL.createObjectURL(file); urls.current.add(url); return { file, url }; })];
      setEntries(next); onChange(next.map(e => e.file));
    } catch (e) { if (active.current) setError(e instanceof Error ? e.message : "Invalid screenshot."); }
    finally { if (active.current) { setBusy(false); onBusyChange(false); } }
  }
  return <fieldset disabled={disabled || busy} className="min-w-0 rounded-xl border border-white/10 p-4"><legend className="px-2 text-sm font-semibold">Screenshots (optional)</legend>
    <p className="text-xs leading-5 text-zinc-400">Add up to five gameplay screenshots, separate from the catalogue thumbnail. JPG, PNG or WebP, up to 5 MB each and 25 megapixels. Uploads are saved after your submission; you can manage them later in Game submissions.</p>
    <label className="mt-3 inline-block cursor-pointer rounded border border-white/20 px-4 py-2 text-sm focus-within:outline-2 focus-within:outline-emerald-300">Choose screenshots<input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Choose screenshots" onChange={e => { const files = Array.from(e.target.files || []); e.target.value = ""; void choose(files); }} /></label>
    <div className="mt-3 flex max-w-full gap-3 overflow-x-auto pb-2">{entries.map((entry, i) => <div key={entry.url} className="w-28 shrink-0"><img src={entry.url} alt={`Selected screenshot ${i + 1}`} className="aspect-video w-full rounded bg-black/40 object-contain" /><button type="button" onClick={() => { URL.revokeObjectURL(entry.url); urls.current.delete(entry.url); const next = entries.filter(e => e !== entry); setEntries(next); onChange(next.map(e => e.file)); }} className="mt-2 text-xs underline">Remove screenshot {i + 1}</button></div>)}</div>
    {busy && <p role="status" className="mt-3 text-sm">Checking screenshots…</p>}{error && <p role="alert" className="mt-3 text-sm text-red-200">{error}</p>}
  </fieldset>;
}
