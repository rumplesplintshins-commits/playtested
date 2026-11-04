import { isDisposableEmail } from "./disposable-email";

export function normalizeContactEmail(value: string | null | undefined): string | null {
  return (value || "").replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, "") || null;
}

// Practical ASCII mailbox syntax: dot-atom local part and DNS domain labels.
// Domain familiarity, DNS/MX records and mailbox existence are not syntax checks.
export function contactEmailError(value: string | null | undefined): string | null {
  const email = normalizeContactEmail(value);
  if (email === null) return null;
  const parts = email.split("@");
  const local = parts[0], domain = parts[1] || "";
  const labels = domain.split(".");
  if (email.length > 254 || /[\r\n]/.test(email) || parts.length !== 2 || local.length > 64 ||
    !/^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:[.][a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*$/.test(local) ||
    labels.length < 2 || labels.some(label => label.length > 63 || !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label))) {
    return "Enter a valid email address such as name@example.com, or leave it blank. Use a local part up to 64 characters and a dotted domain with no empty labels or leading/trailing hyphens (254 characters total).";
  }
  return null;
}

export function contactEmailWarning(value: string): string | null {
  const email = normalizeContactEmail(value);
  if (!email || contactEmailError(email)) return null;
  if (isDisposableEmail(email)) return "This looks like a disposable email provider. Consider an address you can keep accessing. You can still save it.";
  const domain = email.split("@")[1].toLowerCase();
  const likely = ["yopmail.com", "gmail.com", "outlook.com", "hotmail.com", "yahoo.com"].find(known => domain.startsWith(known) && /^[a-z]{1,3}$/.test(domain.slice(known.length)));
  return likely ? `Check the domain spelling: it looks similar to ${likely}. Unfamiliar domains are allowed; you can still save this address.` : null;
}
