"use client";
import { useId, useState } from "react";
import { contactEmailError } from "@/lib/contact-email";

export default function ContactEmailInput({ name, label, value, onChange, className }: {
  name?: string; label: string; value?: string; onChange?: (value: string) => void; className?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const current = value ?? draft;
  const error = contactEmailError(current);
  return <>
    <input type="text" inputMode="email" autoComplete="email" name={name} aria-label={label} value={current}
      aria-invalid={!!error} aria-describedby={error ? id : undefined} placeholder="developer@example.com" className={className}
      ref={input => { input?.setCustomValidity(error || ""); }}
      onChange={event => { event.target.setCustomValidity(contactEmailError(event.target.value) || ""); setDraft(event.target.value); onChange?.(event.target.value); }} />
    {error && <span id={id} className="mt-2 block text-xs leading-5 text-red-200">{error}</span>}
  </>;
}
