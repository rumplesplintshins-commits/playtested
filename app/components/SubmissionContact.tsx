"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase";

type Contact = { contact_email: string | null; contact_discord: string | null; contact_reddit: string | null; contact_allowed: boolean };
const empty: Contact = { contact_email: "", contact_discord: "", contact_reddit: "", contact_allowed: false };
export default function SubmissionContact({ id, admin = false }: { id: string; admin?: boolean }) {
  const [contact, setContact] = useState<Contact>(empty);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void (async () => {
      setLoaded(false); setMessage("");
      try {
        let value: Contact | null;
        if (admin) {
          const res = await fetch(`/api/admin/submission-contact?id=${encodeURIComponent(id)}`, { cache: "no-store" });
          if (!res.ok) throw new Error();
          value = (await res.json()).contact;
        } else {
          const res = await createClient().from("game_submission_contacts").select("contact_email,contact_discord,contact_reddit,contact_allowed").eq("submission_id", id).maybeSingle();
          if (res.error) throw new Error();
          value = res.data;
        }
        if (active) { setContact(value || empty); setLoaded(true); }
      } catch { if (active) setMessage("Private contact details could not be loaded. Please retry."); }
    })();
    return () => { active = false; };
  }, [id, admin, retry]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const client = createClient();
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error();
      const { error } = await client.from("game_submission_contacts").upsert({
        submission_id: id, developer_id: user.id,
        contact_email: contact.contact_email?.trim() || null,
        contact_discord: contact.contact_discord?.trim() || null,
        contact_reddit: contact.contact_reddit?.trim() || null,
        contact_allowed: contact.contact_allowed, updated_at: new Date().toISOString(),
      });
      if (error) throw new Error();
      setMessage("Private contact details and preference saved.");
    } catch { setMessage("Could not save your contact details. Check your sign-in and retry."); }
    finally { setBusy(false); }
  }
  return <section className="my-5 rounded-xl border border-white/10 p-5">
    <h3 className="font-semibold">Private developer contact</h3>
    <p className="mt-2 text-sm text-zinc-400">Visible only to the submission owner and authorised Playtested administrators. This preference covers contact about this game, submission or playtesting opportunities; it is not marketing consent.</p>
    {!loaded && !message && <p role="status" className="mt-3">Loading contact details…</p>}
    {!loaded && message && <button type="button" onClick={() => setRetry(n => n + 1)} className="mt-3 rounded border px-3 py-2">Retry contact details</button>}
    {loaded && (admin ? <div className="mt-4 space-y-2 break-words text-sm">
      <p className={contact.contact_allowed ? "text-emerald-200" : "text-amber-200"}>{contact.contact_allowed ? "Contact permitted for the purposes above." : "Contact consent not given or withdrawn. Do not use these details for optional outreach."}</p>
      <p>Email: {contact.contact_email || "Not provided"}</p><p>Discord: {contact.contact_discord || "Not provided"}</p><p>Reddit: {contact.contact_reddit || "Not provided"}</p>
    </div> : <form onSubmit={save} className="mt-4 space-y-4"><fieldset disabled={busy} className="space-y-4">
      {([ ["contact_email", "Email", 254], ["contact_discord", "Discord username", 100], ["contact_reddit", "Reddit username", 100] ] as const).map(([key, label, max]) => <label key={key} className="block text-sm">{label}<input type={key === "contact_email" ? "email" : "text"} maxLength={max} value={contact[key] || ""} onChange={e => setContact(c => ({ ...c, [key]: e.target.value }))} className="mt-2 block w-full rounded-lg border border-white/20 bg-[#101310] p-3" /></label>)}
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={contact.contact_allowed} onChange={e => setContact(c => ({ ...c, contact_allowed: e.target.checked }))} className="mt-1" /><span>I’m happy for Playtested to contact me about this game, submission or playtesting opportunities. Untick and save to withdraw this permission.</span></label>
      <button type="submit" className="rounded-lg border border-emerald-300/40 px-4 py-2 text-sm">{busy ? "Saving…" : "Save contact preference"}</button>
    </fieldset></form>)}
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </section>;
}
