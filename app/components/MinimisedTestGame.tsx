"use client";

import DisclosureControl from "./DisclosureControl";
import { CampaignPlaces } from "./TestingPolicy";

type Game = { submission_id: string; title: string; genre: string; developer_name: string; image_url: string | null };

export default function MinimisedTestGame({ game, status, onExpand, group }: { game: Game; status?: string; onExpand: () => void; group: "available" | "active" }) {
  return (
    <button id={`expand-${group}-${game.submission_id}`} type="button" aria-label={`Expand ${game.title}${group === "active" ? " active test" : ""}`} aria-expanded={false} onClick={onExpand} data-minimised-game={game.submission_id} className="flex min-h-24 min-w-0 w-full items-center gap-3 rounded-xl border border-white/15 bg-white/[0.035] p-3 text-left transition hover:border-[#77f29b]/50 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-[#77f29b]">
      {game.image_url ? <img src={game.image_url} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" /> : <span aria-hidden="true" className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-black/25 text-center text-[10px] text-zinc-500">No thumbnail</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white" title={game.title}>{game.title}</span>
        <span className="mt-1 block truncate text-xs text-zinc-400" title={`${game.genre || "Other"} · ${game.developer_name}`}>{game.genre || "Other"} · {game.developer_name}</span>
        <span className="mt-1 block">{status ? <span className="line-clamp-2 block text-xs leading-4 text-[#77f29b]">{status}</span> : <CampaignPlaces id={game.submission_id} summaryOnly />}</span>
      </span>
      <span aria-hidden="true" className="flex shrink-0 flex-col items-center gap-1 text-[#77f29b]"><DisclosureControl expanded={false} /><span className="text-[10px] font-medium">Expand</span></span>
    </button>
  );
}