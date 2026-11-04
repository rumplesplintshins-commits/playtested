"use client";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase";
import { gameplayVideo, gameplayGuidance } from "@/lib/gameplay-video";
import GameMediaGallery from "./GameMediaGallery";
import ScreenshotManager from "./ScreenshotManager";
import { type GameScreenshot } from "@/lib/game-screenshots";

export default function GameplayEditor({ id, admin = false }: { id: string; admin?: boolean }) {
  const [url, setUrl] = useState("");
  const [screenshots, setScreenshots] = useState<GameScreenshot[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void (async () => {
      setReady(false); setMessage("");
      const client = createClient();
      const [result, media] = await Promise.all([
        client.from("gameplay_footage").select("video_url").eq("submission_id", id).maybeSingle(),
        admin ? client.from("game_screenshots").select("slot,revision").eq("submission_id", id).order("slot") : Promise.resolve({data:[],error:null}),
      ]);
      if (active) {
        if (result.error || media.error) setMessage("Game media could not be loaded.");
        else { setUrl(result.data?.video_url || ""); setScreenshots(media.data || []); setReady(true); }
      }
    })().catch(() => { if (active) setMessage("Gameplay footage could not be loaded."); });
    return () => { active = false; };
  }, [id, retry, admin]);
  async function save(event: FormEvent) {
    event.preventDefault();
    const video = gameplayVideo(url);
    if (url.trim() && !video) { setMessage("Use a supported HTTPS YouTube, Vimeo or Google Drive video link."); return; }
    setBusy(true); setMessage("");
    try {
      const client = createClient();
      const result = video ? await client.from("gameplay_footage").upsert({ submission_id: id, video_url: video.url, updated_at: new Date().toISOString() }) : await client.from("gameplay_footage").delete().eq("submission_id", id);
      if (result.error) throw new Error();
      setUrl(video?.url || ""); setMessage(video ? "Gameplay footage saved." : "Gameplay footage removed.");
    } catch { setMessage("Could not save footage. Check your sign-in and retry."); }
    finally { setBusy(false); }
  }
  if (admin) return <>{!ready ? <section className="my-5 rounded-xl border border-white/10 p-5"><h3 className="font-semibold">Game Media preview</h3><p role="status" className="mt-3 text-sm">{message || "Loading game media…"}</p>{message && <button type="button" onClick={() => setRetry(n => n + 1)} className="mt-3 rounded border px-3 py-2">Retry media</button>}</section> : <GameMediaGallery id={id} videoUrl={url} screenshots={screenshots} />}</>;
  return <><section className="my-5 rounded-xl border border-white/10 p-5"><h3 className="font-semibold">Gameplay footage (optional)</h3><p className="mt-2 text-sm text-zinc-400">{gameplayGuidance}</p>
    {!ready && !message && <p role="status" className="mt-3">Loading footage…</p>}
    {!ready && message && <button onClick={() => setRetry(n => n + 1)} className="mt-3 rounded border px-3 py-2">Retry footage</button>}
    {ready && <form onSubmit={save} className="mt-4"><label className="text-sm">Gameplay video link<input type="url" maxLength={500} value={url} onChange={e => setUrl(e.target.value)} disabled={busy} className="mt-2 block w-full rounded border border-white/20 bg-[#101310] p-3" /></label><p className="mt-2 text-xs text-zinc-400">Clear the link and save to remove footage.</p><button disabled={busy} className="mt-3 rounded border border-emerald-300/40 px-4 py-2 text-sm">{busy ? "Saving…" : "Save gameplay footage"}</button></form>}
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </section><ScreenshotManager id={id} /></>;
}
