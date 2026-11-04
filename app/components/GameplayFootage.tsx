"use client";
import { useState } from "react";
import { gameplayVideo } from "@/lib/gameplay-video";

export default function GameplayFootage({ url }: { url: string }) {
  const video = gameplayVideo(url);
  const [loaded, setLoaded] = useState(false);
  if (!video) return null;
  return <section className="my-5 rounded-xl border border-white/10 p-5"><h2 className="text-lg font-semibold">Gameplay footage (optional)</h2>
    <p className="mt-2 text-sm text-zinc-400">Developer-supplied footage, hosted by {video.provider}. Opening or loading it shares your connection information with that provider under its privacy terms.</p>
    <a href={video.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block break-all text-sm text-emerald-300 underline">Watch on {video.provider} (new tab)</a>
    {video.embed && (!loaded ? <button type="button" onClick={() => setLoaded(true)} className="ml-4 mt-3 rounded border border-white/20 px-4 py-2 text-sm">Load {video.provider} player</button> : <><iframe src={video.embed} title={`${video.provider} gameplay footage`} className="mt-4 aspect-video w-full rounded-lg" allow="fullscreen; picture-in-picture" referrerPolicy="no-referrer" allowFullScreen /><button type="button" onClick={() => setLoaded(false)} className="mt-2 text-sm underline">Close player</button></>)}
  </section>;
}
