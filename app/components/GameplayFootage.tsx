"use client";
import { useEffect, useState } from "react";
import { gameplayVideo, type GameplayVideo } from "@/lib/gameplay-video";

export default function GameplayFootage({ url, embedded = false }: { url: string; embedded?: boolean }) {
  const video = gameplayVideo(url);
  if (!video) return <section className="my-5 rounded-xl border border-white/10 p-5"><h2 className="text-lg font-semibold">Gameplay Footage</h2><p className="mt-2 text-sm text-zinc-400">Video unavailable: the supplied link is invalid or unsupported.</p></section>;
  // A different video must receive its own explicit loading choice.
  return <GameplayPlayer key={video.embed} video={video} embedded={embedded} />;
}

function GameplayPlayer({ video, embedded }: { video: GameplayVideo; embedded: boolean }) {
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (phase !== "loading") return;
    const timer = window.setTimeout(() => setSlow(true), 15000);
    return () => window.clearTimeout(timer);
  }, [phase]);
  function play() { setSlow(false); setPhase("loading"); }
  const Heading = embedded ? "h3" : "h2";
  return <section className={embedded ? "min-w-0" : "my-5 min-w-0 rounded-xl border border-white/10 p-4 sm:p-5"}>
    <Heading className="text-lg font-semibold">Gameplay Footage</Heading>
    <p className="mt-2 text-sm leading-6 text-zinc-400">Hosted by {video.provider}. Clicking Play loads its player and shares connection information with that provider under its privacy terms. Start playback in the player; videos do not autoplay.</p>
    <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-xl border border-emerald-300/15 bg-[#0c120f]">
      {phase === "idle" ? <button type="button" aria-label={`Play ${video.provider} gameplay video`} onClick={play}
        className="group flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-300/10 via-[#101a14] to-[#090b0a] p-2 text-center transition hover:from-emerald-300/15 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-emerald-300 sm:gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-300/10 text-emerald-200 transition group-hover:scale-105 sm:h-16 sm:w-16"><svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" className="ml-1 fill-current"><path d="M7 4.5v15l12-7.5z" /></svg></span>
        <span><span className="block text-sm font-semibold text-zinc-100 sm:text-base">Play gameplay video</span><span className="mt-1 hidden text-xs text-zinc-400 sm:block">{video.provider} · Loads only when you choose</span></span>
      </button> : phase === "error" ? <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
        <p role="alert" className="text-sm font-semibold text-amber-200">Video unavailable</p>
      </div> : <>
        <iframe src={video.embed} title={`${video.provider} gameplay footage`} className="absolute inset-0 h-full w-full"
          allow="fullscreen; picture-in-picture" referrerPolicy="no-referrer" allowFullScreen
          onLoad={() => setPhase(current => current === "loading" ? "ready" : current)} onError={() => setPhase(current => current === "idle" ? current : "error")} />
      </>}
    </div>
    {phase === "loading" && <p role="status" className="mt-2 text-xs text-zinc-400">{slow ? "The video is taking longer than expected. You can open it in a new tab instead." : "Loading video player…"}</p>}
    {phase === "error" && <p className="mt-3 text-sm text-zinc-400">The player could not load. Try again or open the video in a new tab to check its availability and sharing permissions.</p>}
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
      <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-300 underline underline-offset-4">Open video in new tab <span aria-hidden="true">↗</span></a>
      {phase === "error" && <button type="button" onClick={play} className="rounded-lg border border-white/20 px-3 py-2 text-sm">Try player again</button>}
      {phase !== "idle" && <button type="button" onClick={() => setPhase("idle")} className="text-sm text-zinc-300 underline underline-offset-4">Close player</button>}
    </div>
    <p className="mt-3 text-xs leading-5 text-zinc-500">If the video is unavailable or asks for access, open it in a new tab. The host may restrict embedding, require sign-in or limit sharing.</p>
  </section>;
}
