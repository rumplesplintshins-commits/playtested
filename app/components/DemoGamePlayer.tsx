"use client";
import { useEffect, useReducer } from "react";
import Link from "next/link";
import { demoGameReducer, demoInitialState, type DemoGame } from "@/lib/demo-games";

export function DemoGamePlayer({ game }: { game: DemoGame }) {
  const [state, dispatch] = useReducer(demoGameReducer, demoInitialState);
  useEffect(() => {
    if (game.slug !== "mosslight-grove") return;
    function key(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName))) return;
      const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const move = directions[event.key];
      if (move) { event.preventDefault(); dispatch({ type: "move", dx: move[0], dy: move[1] }); }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [game.slug]);
  const won = game.slug === "neon-courier" ? state.hits >= 8 : game.slug === "mosslight-grove" ? state.lights.length === 3 : state.energy >= 6 && state.metal >= 6;
  const finished = won || (game.slug === "orbit-foundry" && state.turns >= 8);
  const button = "rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300 disabled:opacity-50";
  return <main className="min-h-screen bg-[#090b0a] px-5 py-10 text-white"><div className="mx-auto max-w-4xl">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/tester" className="text-sm text-emerald-300">← Back to Tester Hub</Link><span className="rounded-full border border-amber-400/30 px-3 py-1 text-xs text-amber-200">DEMO · local test build</span></div>
    <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.15fr]">
      <div><p className="text-xs uppercase tracking-widest" style={{color:game.color}}>{game.genre}</p><h1 className="mt-3 text-3xl font-bold">{game.title}</h1><p className="mt-4 text-sm leading-6 text-zinc-400">{game.description}</p><div className="mt-6 rounded-xl border border-white/10 p-4"><h2 className="text-sm font-semibold">Your objective</h2><p className="mt-2 text-sm leading-6 text-zinc-400">{game.goal}</p></div><p className="mt-4 text-xs leading-5 text-zinc-500">This is a small QA prototype. Playing does not submit feedback or award XP. Return to Tester Hub to complete your report.</p><div className="mt-5 flex flex-wrap gap-3"><Link className={button} href={`/submissions/${game.id}`}>Game page</Link><Link className={button} href="/tester">Submit feedback in Tester Hub</Link></div></div>
      <section aria-label={`${game.title} game`} className="rounded-2xl border border-white/10 p-5" style={{background:game.background}}>
        {game.slug === "neon-courier" && <><p className="mb-4 text-sm">Parcels {state.hits}/8 · Misses {state.misses}</p><div className="grid grid-cols-3 gap-3">{Array.from({length:9},(_,tile)=><button key={tile} disabled={finished} aria-label={tile === (state.hits * 7 + 4) % 9 ? "Collect glowing parcel" : `Empty bay ${tile+1}`} onClick={()=>dispatch({type:"hit",tile})} className={`aspect-square rounded-xl border text-3xl transition ${tile === (state.hits * 7 + 4) % 9 ? "border-cyan-200 bg-cyan-300/20 text-cyan-100" : "border-white/10 bg-black/20 text-white/15"}`}>{tile === (state.hits * 7 + 4) % 9 ? "◈" : "·"}</button>)}</div></>}
        {game.slug === "mosslight-grove" && <><p className="mb-4 text-sm">Lights {state.lights.length}/3 · Moves {state.moves}</p><div className="grid grid-cols-3 gap-3" aria-label="Grove map">{Array.from({length:9},(_,tile)=><div key={tile} className={`flex aspect-square items-center justify-center rounded-xl border text-3xl ${state.position === tile ? "border-lime-200 bg-lime-300/15" : "border-white/10 bg-black/20"}`} aria-label={state.position===tile?"Your position":tile===4?"Blocked thicket":[2,6,8].includes(tile)&&!state.lights.includes(tile)?"Lost light":"Path"}>{state.position===tile?"●":tile===4?"▧":[2,6,8].includes(tile)&&!state.lights.includes(tile)?"✦":"·"}</div>)}</div><div className="mt-4 flex flex-wrap justify-center gap-2">{([['←',-1,0,'Move left'],['↑',0,-1,'Move up'],['↓',0,1,'Move down'],['→',1,0,'Move right']] as const).map(([label,dx,dy,name])=><button key={name} className={button} disabled={finished} aria-label={name} onClick={()=>dispatch({type:"move",dx,dy})}>{label}</button>)}</div></>}
        {game.slug === "orbit-foundry" && <><p className="text-sm">Turns {state.turns}/8</p><div className="my-6 grid grid-cols-2 gap-3"><div className="rounded-xl border border-white/10 bg-black/20 p-5"><p className="text-xs text-violet-200">Energy</p><p className="mt-2 text-3xl font-semibold">{state.energy}/6</p></div><div className="rounded-xl border border-white/10 bg-black/20 p-5"><p className="text-xs text-violet-200">Metal</p><p className="mt-2 text-3xl font-semibold">{state.metal}/6</p></div></div><div className="grid gap-3"><button className={button} disabled={finished} onClick={()=>dispatch({type:"order",resource:"energy"})}>Solar order · +2 energy</button><button className={button} disabled={finished} onClick={()=>dispatch({type:"order",resource:"metal"})}>Mining order · +2 metal</button></div></>}
        <p role="status" className="mt-5 min-h-6 text-sm font-semibold">{won?"Objective complete — return to the Hub or play again.":finished?"The station ran out of turns. Try a different balance.":""}</p><button className={button} onClick={()=>dispatch({type:"reset"})}>Restart demo</button>
      </section>
    </div>
  </div></main>;
}
