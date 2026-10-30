"use client";
import type {AnchorHTMLAttributes} from "react";
import Link from "next/link";
import type {ShareTags} from "@/lib/share-links";
type Context={title:string;path:string;tester_path:string|null;tags:ShareTags};
export function ShareEntry({context}:{id:string;context:Context}){
 return <main className="min-h-screen bg-[#090b0a] px-5 py-16 text-white"><section className="mx-auto max-w-xl rounded-2xl border border-white/10 p-7"><p className="text-xs uppercase tracking-widest text-emerald-300">Shared on Playtested</p><h1 className="mt-4 text-3xl font-bold">{context.title}</h1><p className="mt-4 text-sm leading-6 text-zinc-400">Discover this game and any available testing opportunities. Signing in does not bypass testing requirements or guarantee a place.</p><Link prefetch={false} href={context.path} className="mt-6 block rounded-lg bg-emerald-400 px-5 py-3 text-center text-sm font-semibold text-black">{context.path.startsWith("/tester")||context.path.startsWith("/playtest/")?"View this playtest":"View game page"}</Link><p role="status" className="mt-4 text-xs leading-5 text-zinc-400">This share link opens the normal Playtested destination without journey attribution.</p></section></main>;
}
export function ShareJourneyBanner(){return null;}
export function TrackedAccessLink({children,...props}:AnchorHTMLAttributes<HTMLAnchorElement>&{campaignId?:string}){
 const {campaignId:_campaignId,...anchorProps}=props;
 return <a {...anchorProps}>{children}</a>;
}
