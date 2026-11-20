"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase";

type Role = "owner" | "editor" | "viewer";
type Studio = { id: string; name: string; role: Role };
type Team = {
  studios: Studio[];
  limit: number;
  membership_limit: number;
  active_memberships: number;
  reserved_memberships: number;
  inbox: { id:string; name:string; role:Role; expires_at:string }[];
  members: { id:string; name:string|null; role:Role; email:string|null; joined_at:string }[];
  pending: { id:string; email:string; role:Role; expires_at:string }[];
  games: { id:string; title:string; image:string|null; shared:boolean }[];
};
type Change = { p_action:string; p_target?:string; p_role?:Role; p_name?:string; p_email?:string };
const panel = "space-y-4 rounded-xl border border-white/10 bg-[#101511] p-4 sm:p-6";
const input = "w-full min-w-0 rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-white focus-visible:outline-2 focus-visible:outline-emerald-300";
const button = "rounded-lg border border-emerald-300/30 px-3 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-300/10 focus-visible:outline-2 focus-visible:outline-emerald-300 disabled:opacity-50";
const titles: Record<Role,string> = {owner:"Owner",editor:"Editor",viewer:"Viewer"};
const date = (value:string) => new Date(value).toLocaleDateString("en-GB",{timeZone:"UTC"});

function StudioNameForm({ label, initialName="", submitLabel, busy, onSave, clearOnSave=false }: {
  label:string; initialName?:string; submitLabel:string; busy:boolean;
  onSave:(name:string)=>Promise<boolean>; clearOnSave?:boolean;
}) {
  const id=useId();
  const [name,setName]=useState(initialName);
  const [error,setError]=useState("");

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned=name.trim();
    if(!cleaned){setError("Enter a studio name.");return;}
    if(cleaned.length<3||cleaned.length>50){setError("Use 3 to 50 characters.");return;}
    if(/[\u0000-\u001f\u007f-\u009f]/u.test(cleaned)){setError("Remove control characters from the studio name.");return;}
    setError("");
    if(await onSave(cleaned))setName(clearOnSave?"":cleaned);
  }

  return <form className="flex flex-wrap items-start gap-2" noValidate onSubmit={submit}>
    <div className="min-w-0 flex-1 basis-48">
      <label htmlFor={id} className="text-sm">{label}</label>
      <input id={id} className={input} name="name" maxLength={50} required value={name}
        aria-invalid={Boolean(error)} aria-describedby={error?`${id}-count ${id}-error`:`${id}-count`}
        onChange={event=>{setName(event.target.value);setError("");}} />
      <p id={`${id}-count`} className="mt-1 text-right text-xs tabular-nums text-zinc-400">{name.length}/50</p>
      {error&&<p id={`${id}-error`} role="alert" className="mt-1 text-xs text-amber-200">{error}</p>}
    </div>
    <button className={button+" mt-5"} disabled={busy}>{submitLabel}</button>
  </form>;
}

export default function StudioTeam({canCreate}:{canCreate:boolean}) {
  const [team,setTeam] = useState<Team|null>(null);
  const [selected,setSelected] = useState("");
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState("");
  const [error,setError] = useState("");
  const [retryable,setRetryable] = useState(false);
  const [loading,setLoading] = useState(true);
  const request = useRef(0);
  const locked = useRef(false);

  const load=useCallback(async function loadTeam(id:string, autoSelect=false) {
    const run=++request.current;
    setLoading(true);
    setError("");
    setRetryable(false);
    const client=createClient();
    const result=await client.rpc("get_studio_team",{p_studio:id||null});
    if(run!==request.current)return;
    if(result.error){setError(result.error.message);setRetryable(!result.status||result.status>=500||result.error.code==="40001");setTeam(null);setLoading(false);return;}
    const data=result.data as Team;
    const first=autoSelect && !id && data.studios[0]?.id;
    if(first){await loadTeam(first);return;}
    setTeam(data);
    setSelected(id);
    setLoading(false);
  },[]);

  useEffect(()=>{
    const sequence=request;
    const timer=window.setTimeout(()=>void load(new URLSearchParams(location.search).get("studio")||"",true),0);
    return ()=>{window.clearTimeout(timer);sequence.current++;};
  },[load]);

  async function change(args:Change) {
    if(locked.current)return false;
    locked.current=true;
    setBusy(true);setError("");setRetryable(false);setNotice("");
    try {
      const {data,error:failure}=await createClient().rpc("change_studio",{p_studio:selected||null,...args});
      if(failure)throw failure;
      const id=args.p_action==="leave"?"":args.p_action==="create"||args.p_action==="accept"?data.id:selected;
      await load(id,args.p_action==="leave");
      if(args.p_action==="accept"||args.p_action==="decline")window.dispatchEvent(new Event("playtested-notifications-changed"));
      setNotice(data.message||(args.p_action==="accept"?"You joined the studio.":"Studio updated."));
      return true;
    } catch (failure) {
      const limitReached=typeof failure==="object"&&failure&&"code" in failure&&failure.code==="PST01";
      if(limitReached)await load(selected,true);
      setError(limitReached?"Your studio limit is reached. Leave a joined studio or decline a pending invitation to free a place.":typeof failure==="object"&&failure&&"message" in failure?String(failure.message):"Could not update the studio.");
      return false;
    } finally {locked.current=false;setBusy(false);}
  }

  function invite(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form=event.currentTarget;
    const data=new FormData(form);
    void change({p_action:"invite",p_email:String(data.get("email")),p_role:data.get("role") as Role}).then(ok=>{if(ok)form.reset();});
  }

  const studio=team?.studios.find(item=>item.id===selected);
  const owner=studio?.role==="owner";
  const places=team ? Math.max(0,team.limit-Math.max(0,team.members.length-1)-team.pending.length) : 0;
  return <>
    {notice&&<p role="status" className="text-sm text-emerald-200">{notice}</p>}
    {error&&<p role="alert" className="text-sm text-amber-200">{error} {retryable&&<button className={button} onClick={()=>void load(selected,true)}>Retry</button>}</p>}
    {loading&&!team&&<p role="status">Loading studio workspaces…</p>}
    {team&&<>
      {team.inbox.length>0&&<section className={panel} aria-label="Studio invitations">
        <h2 className="text-lg font-semibold">Studio invitations</h2>
        {team.inbox.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
          <div className="min-w-0"><p className="font-medium [overflow-wrap:anywhere]">{item.name}</p><p className="text-sm text-zinc-400">{titles[item.role]} · Expires {date(item.expires_at)}</p></div>
          <div className="flex gap-2"><button className={button} disabled={busy||team.active_memberships>=team.membership_limit} onClick={()=>void change({p_action:"accept",p_target:item.id})}>Accept</button><button className={button} disabled={busy} onClick={()=>void change({p_action:"decline",p_target:item.id})}>Decline</button></div>
        </div>)}
      </section>}
      <section className={panel}>
        {team.studios.length>0&&<label className="block max-w-sm text-sm">Studio workspace
          <select className={input+" truncate"} value={selected} disabled={busy||loading} onChange={event=>void load(event.target.value)}>
            <option value="">Choose a studio</option>{team.studios.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>}
        {studio&&<><h2 className="text-xl font-bold [overflow-wrap:anywhere]">{studio.name}</h2>
          <p className="text-sm text-zinc-300">{team.members.length} of {team.limit+1} members · {team.games.filter(game=>game.shared).length} studio games · {titles[studio.role]}</p>
          <p className="text-sm text-zinc-400">Accepted colleagues can access this studio’s shared games and build feedback.</p>
          <a className={button+" inline-block"} href={"/my-submissions?studio="+studio.id}>Open studio My Games</a>
          {!owner&&<button type="button" disabled={busy} className={button+" ml-2"} onClick={()=>{if(confirm("Leave this studio and give up access to its shared games?"))void change({p_action:"leave"});}}>Leave studio</button>}
          {owner&&<StudioNameForm key={studio.id+studio.name} label="Studio name" initialName={studio.name} submitLabel="Save name" busy={busy} onSave={name=>change({p_action:"rename",p_name:name})} />}
        </>}
        {team.active_memberships>=team.membership_limit
          ? <p className="text-sm text-zinc-400">{team.membership_limit===1?"Free accounts can belong to one studio.":"Your account can belong to two studios."} {team.active_memberships>team.membership_limit&&"Your existing studios remain accessible. Leave a joined studio to bring your account within the limit."}</p>
          : team.reserved_memberships>=team.membership_limit
            ? <p className="text-sm text-zinc-400">A pending invitation reserves your remaining studio place. Accept or decline it in Studio invitations.</p>
            : canCreate&&<StudioNameForm label="New studio name" submitLabel="Create studio" busy={busy} clearOnSave onSave={name=>change({p_action:"create",p_name:name})} />}
      </section>
      {studio&&<>
        <section className={panel}><h2 className="text-lg font-semibold">Team members</h2>
          {team.members.map(member=><div key={member.id} className="flex min-h-20 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/10 py-3">
            <div className="min-w-0 flex-1 basis-48">
              <p className="flex flex-wrap items-center gap-2 font-medium"><span className="min-w-0 [overflow-wrap:anywhere]">{member.name||"Playtested member"}</span><span className="rounded-full border border-white/20 px-2 py-0.5 text-xs text-emerald-200">{titles[member.role]}</span></p>
              <p className="mt-1 text-sm text-zinc-400 [overflow-wrap:anywhere]">{member.email&&member.email+" · "}Joined {date(member.joined_at)}</p>
            </div>
            {owner&&member.role!=="owner"&&<div className="flex flex-wrap gap-2">
              <select aria-label={"Role for "+(member.name||member.email)} className={input+" w-auto"} disabled={busy} value={member.role} onChange={event=>void change({p_action:"role",p_target:member.id,p_role:event.target.value as Role})}><option value="editor">Editor</option><option value="viewer">Viewer</option></select>
              <button className={button} disabled={busy} onClick={()=>{if(confirm("Remove this member’s studio access?"))void change({p_action:"remove",p_target:member.id});}}>Remove</button>
            </div>}
          </div>)}
        </section>
        {owner&&<section className={panel}><h2 className="text-lg font-semibold">Invite colleagues</h2>
          <p className="text-sm text-zinc-300">{places} of {team.limit} colleague places available. {places===0?"Pending invitations reserve places.":""}</p>
          <p className="text-sm text-zinc-400">Your colleague must already have a Playtested account.</p>
          <form onSubmit={invite} className="flex flex-wrap items-end gap-2">
            <label className="min-w-0 grow text-sm">Registered Playtested email<input className={input} type="email" name="email" maxLength={254} required /></label>
            <label className="text-sm">Access level<select className={input} name="role"><option value="editor">Editor</option><option value="viewer">Viewer</option></select></label>
            <button className={button} disabled={busy||!places}>{busy?"Working…":"Invite member"}</button>
          </form>
          {team.pending.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
            <p className="min-w-0 break-all text-sm">{item.email} · {titles[item.role]} · Pending until {date(item.expires_at)}</p>
            <button className={button} disabled={busy} onClick={()=>void change({p_action:"cancel",p_target:item.id})}>Cancel invitation</button>
          </div>)}
        </section>}
        <section className={panel}><h2 className="text-lg font-semibold">Studio games</h2>
          {team.games.length===0&&<p className="text-sm text-zinc-400">No eligible games to show.</p>}
          {team.games.map(game=><div key={game.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
            <div className="flex min-w-0 items-center gap-3">
              {/* The existing game cover can come from a developer-supplied host. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {game.image&&<img src={game.image} alt="" loading="lazy" className="h-10 w-16 shrink-0 rounded object-cover" />}
              <div className="min-w-0 break-words"><p className="font-medium">{game.title}</p><p className="text-xs text-zinc-400">{game.shared?"Shared with studio":"Personal game"}</p></div>
            </div>
            {owner&&<button className={button} disabled={busy} onClick={()=>{if(!game.shared||confirm("Remove this game from the studio? The game and feedback are kept."))void change({p_action:game.shared?"unassign":"assign",p_target:game.id});}}>{game.shared?"Remove from studio":"Assign to studio"}</button>}
          </div>)}
        </section>
      </>}
    </>}
  </>;
}
