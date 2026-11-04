"use client";
/* eslint-disable @next/next/no-img-element -- Browser-local previews and private no-store media must bypass the image optimizer. */
import { useState } from "react";
import { screenshotUrl, type GameScreenshot } from "@/lib/game-screenshots";
import GameplayFootage from "./GameplayFootage";
import VideoPoster from "./VideoPoster";
import {videoPosterSources} from "@/lib/gameplay-poster";

export default function GameMediaGallery(props: { id: string; videoUrl?: string | null; screenshots: GameScreenshot[]; catalogueThumbnail?: string | null }) {
  const key = `${props.videoUrl || ""}|${props.screenshots.map(s => `${s.slot}:${s.revision}`).join("|")}`;
  return <Gallery key={key} {...props} />;
}
function Gallery({ id, videoUrl, screenshots, catalogueThumbnail }: { id: string; videoUrl?: string | null; screenshots: GameScreenshot[]; catalogueThumbnail?: string | null }) {
  const [selected, setSelected] = useState(0);
  const offset = videoUrl ? 1 : 0;
  const index = selected - offset;
  const shot = screenshots[index];
  const count = screenshots.length + offset;
  return <section aria-labelledby={`media-${id}`} className="my-5 min-w-0 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
    <h2 id={`media-${id}`} className="mb-4 text-xl font-semibold">Game Media</h2>
    {!count ? <p className="text-sm text-zinc-400">No gameplay footage or screenshots have been added yet.</p> : <>
      {selected === 0 && videoUrl ? <GameplayFootage url={videoUrl} embedded posterSources={videoPosterSources(id,videoUrl,screenshots,catalogueThumbnail)}/> : shot && <>
        <h3 className="mb-3 text-base font-semibold">Screenshot {index + 1} of {screenshots.length}</h3>
        <ScreenshotView key={shot.revision} url={screenshotUrl(id, shot)} number={index + 1} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button type="button" disabled={screenshots.length < 2} onClick={() => setSelected(offset + (index + screenshots.length - 1) % screenshots.length)} className="rounded-lg border border-white/20 px-3 py-2 text-sm disabled:opacity-40">Previous screenshot</button>
          <button type="button" disabled={screenshots.length < 2} onClick={() => setSelected(offset + (index + 1) % screenshots.length)} className="rounded-lg border border-white/20 px-3 py-2 text-sm disabled:opacity-40">Next screenshot</button>
        </div>
      </>}
      {count > 1 && <div role="group" aria-label="Select game media" className="mt-5 flex max-w-full gap-3 overflow-x-auto pb-3">
        {videoUrl && <button type="button" aria-label="View Gameplay Footage" aria-pressed={selected === 0} onClick={() => setSelected(0)} className={`w-28 shrink-0 rounded-lg border p-2 text-left ${selected === 0 ? "border-emerald-300 bg-emerald-300/10" : "border-white/15"}`}><span className="relative flex aspect-video items-center justify-center overflow-hidden rounded bg-[#101310] text-2xl text-emerald-200" aria-hidden="true"><VideoPoster sources={videoPosterSources(id,videoUrl,screenshots,catalogueThumbnail,true)}/><span className="relative z-10">&#9654;</span></span><span className="mt-2 block text-xs">Gameplay Footage</span></button>}
        {screenshots.map((item, i) => <button key={item.slot} type="button" aria-label={`View screenshot ${i + 1}`} aria-pressed={selected === offset + i} onClick={() => setSelected(offset + i)} className={`w-28 shrink-0 rounded-lg border p-2 text-left ${selected === offset + i ? "border-emerald-300 bg-emerald-300/10" : "border-white/15"}`}><img loading="lazy" src={screenshotUrl(id, item, true)} alt="" className="aspect-video w-full rounded bg-black/40 object-contain" /><span className="mt-2 block text-xs">Screenshot {i + 1}</span></button>)}
      </div>}
    </>}
  </section>;
}
function ScreenshotView({ url, number }: { url: string; number: number }) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const [retry, setRetry] = useState(0);
  return <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black/40">
    {state === "error" ? <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center text-sm text-zinc-400"><p role="alert">Screenshot unavailable.</p><button type="button" onClick={() => { setState("loading"); setRetry(n => n + 1); }} className="rounded border border-white/20 px-3 py-2">Retry screenshot</button></div> : <>
      <img key={retry} ref={image => { if (image?.complete) setState(image.naturalWidth ? "loaded" : "error"); }} src={`${url}&retry=${retry}`} alt={`Gameplay screenshot ${number}`} className="absolute inset-0 h-full w-full object-contain" onLoad={() => setState("loaded")} onError={() => setState("error")} />
      {state === "loading" && <p role="status" className="absolute inset-x-0 bottom-0 bg-black/70 p-2 text-center text-xs text-zinc-300">Loading screenshot…</p>}
    </>}
  </div>;
}
