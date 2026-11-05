"use client";
import {developerSaved} from "@/lib/developer-save";
/* eslint-disable @next/next/no-img-element -- Browser-local previews and private no-store media must bypass the image optimizer. */
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { screenshotUrl, validateScreenshot, type GameScreenshot } from "@/lib/game-screenshots";

export async function uploadScreenshot(id: string, slot: number, file: File) {
  const body = new FormData(); body.set("file", file);
  const response = await fetch(`/api/game-media/${encodeURIComponent(id)}/${slot}`, { method: "PUT", body });
  if (!response.ok) throw new Error((await response.json()).error || "Screenshot upload failed.");
}
export default function ScreenshotManager({ id, management=false }: { id: string; management?:boolean }) {
  const [screenshots, setScreenshots] = useState<GameScreenshot[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const load = useCallback(async () => {
    const result = await createClient().from("game_screenshots").select("slot,revision").eq("submission_id", id).order("slot");
    if (result.error) throw new Error("Screenshots could not be loaded. Please retry.");
    return result.data || [];
  }, [id]);
  async function refresh() { setScreenshots(await load()); setReady(true); }
  useEffect(() => { let active = true; void load().then(data => { if (active) { setScreenshots(data); setReady(true); } }).catch(e => { if (active) setMessage(e.message); }); return () => { active = false; }; }, [load, retry]);
  async function upload(files: File[], replaceSlot?: number) {
    if (!files.length||busy) return;
    const free = [1, 2, 3, 4, 5].filter(slot => !screenshots.some(s => s.slot === slot));
    if (replaceSlot === undefined && files.length > free.length) { setMessage("A game can have up to five screenshots. Remove or replace an existing screenshot first."); return; }
    setBusy(true); setMessage("");
    try {
      for (const file of files) await validateScreenshot(file);
      for (let i = 0; i < files.length; i++) await uploadScreenshot(id, replaceSlot ?? free[i], files[i]);
      setMessage(replaceSlot ? "Screenshot replaced." : "Screenshots added.");
      if(management)developerSaved(replaceSlot ? "Screenshot replaced." : "Screenshots added.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not upload screenshots. Please retry."); }
    finally { await refresh().catch(() => setMessage("Refresh to check which screenshots were saved before retrying.")); setBusy(false); }
  }
  async function remove(slot: number) {
    if(busy)return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/game-media/${encodeURIComponent(id)}/${slot}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json()).error || "Could not remove screenshot.");
      await refresh(); setMessage("Screenshot removed.");
      if(management)developerSaved("Screenshot removed.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not remove screenshot. Please retry."); }
    finally { setBusy(false); }
  }
  return <section className="my-5 min-w-0 rounded-xl border border-white/10 p-5"><h3 className="font-semibold">Screenshots (optional)</h3>
    <p className="mt-2 text-sm leading-6 text-zinc-400">Up to five JPG, PNG or WebP screenshots, 5 MB each and 25 megapixels maximum. These are separate from your catalogue thumbnail. Images keep their proportions and are displayed publicly only while the game is approved.</p>
    {!ready && !message && <p role="status" className="mt-3 text-sm">Loading screenshots…</p>}
    {!ready && message && <button type="button" onClick={() => setRetry(n => n + 1)} className="mt-3 rounded border px-3 py-2">Retry screenshots</button>}
    {ready && <fieldset disabled={busy} className="mt-4 min-w-0 space-y-4"><legend className="sr-only">Manage screenshots</legend>
      <p className="text-sm text-zinc-400">{screenshots.length ? `${screenshots.length} / 5 screenshots` : "No screenshots yet."}</p>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">{screenshots.map(shot => <div key={shot.slot} className="min-w-0 rounded-lg border border-white/10 p-3"><img loading="lazy" src={screenshotUrl(id, shot, true)} alt={`Screenshot ${shot.slot}`} className="aspect-video w-full rounded bg-black/40 object-contain" /><div className="mt-3 flex flex-wrap gap-3"><label className="cursor-pointer rounded border border-white/20 px-3 py-2 text-sm focus-within:outline-2 focus-within:outline-emerald-300">Replace screenshot {shot.slot}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={`Replace screenshot ${shot.slot}`} onChange={e => { const files = Array.from(e.target.files || []); e.target.value = ""; void upload(files, shot.slot); }} /></label><button type="button" onClick={() => void remove(shot.slot)} className="rounded border border-white/20 px-3 py-2 text-sm">Remove screenshot {shot.slot}</button></div></div>)}</div>
      <label className={`inline-block rounded border border-emerald-300/30 px-4 py-2 text-sm focus-within:outline-2 focus-within:outline-emerald-300 ${screenshots.length === 5 ? "opacity-40" : "cursor-pointer"}`}>Add screenshots<input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={screenshots.length === 5 || busy} className="sr-only" aria-label="Add screenshots" onChange={e => { const files = Array.from(e.target.files || []); e.target.value = ""; void upload(files); }} /></label>
    </fieldset>}
    {busy && <p role="status" className="mt-3 text-sm">Saving screenshots…</p>}{message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </section>;
}
