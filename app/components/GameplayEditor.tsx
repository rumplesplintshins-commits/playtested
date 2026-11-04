"use client";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase";
import { gameplayVideo, gameplayGuidance } from "@/lib/gameplay-video";
import GameplayFootage from "./GameplayFootage";

export default function GameplayEditor({ id, admin = false }: { id: string; admin?: boolean }) {
  const [url, setUrl] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void (async () => {
      setReady(false); setMessage("");
      const result = await createClient().from("gameplay_footage").select("video_url").eq("submission_id", id).maybeSingle();
      if (active) {
        if (result.error) setMessage("Gameplay footage could not be loaded.");
        else { setUrl(result.data?.video_url || ""); setReady(true); }
      }
    })().catch(() => { if (active) setMessage("Gameplay footage could not be loaded."); });
    return () => { active = false; };
  }, [id, retry]);
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
  return <section className="my-5 rounded-xl border border-white/10 p-5"><h3 className="font-semibold">Optional gameplay footage</h3><p className="mt-2 text-sm text-zinc-400">{gameplayGuidance}</p>
    {!ready && !message && <p role="status" className="mt-3">Loading footage…</p>}
    {!ready && message && <button onClick={() => setRetry(n => n + 1)} className="mt-3 rounded border px-3 py-2">Retry footage</button>}
    {ready && (admin ? (url ? <GameplayFootage key={url} url={url} /> : <p className="mt-3 text-sm text-zinc-400">No footage supplied. Footage is not required for approval.</p>) : <form onSubmit={save} className="mt-4"><label className="text-sm">Gameplay video link<input type="url" maxLength={500} value={url} onChange={e => setUrl(e.target.value)} disabled={busy} className="mt-2 block w-full rounded border border-white/20 bg-[#101310] p-3" /></label><p className="mt-2 text-xs text-zinc-400">Clear the link and save to remove footage.</p><button disabled={busy} className="mt-3 rounded border border-emerald-300/40 px-4 py-2 text-sm">{busy ? "Saving…" : "Save gameplay footage"}</button></form>)}
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </section>;
}
