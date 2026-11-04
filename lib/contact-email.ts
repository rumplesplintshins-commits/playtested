import { isDisposableEmail } from "./disposable-email";
import policy from "./contact-email-policy.json";
const allowedSuffixes = new Set(policy.allowedSuffixes);

export function normalizeContactEmail(value: string | null | undefined): string | null {
  return (value || "").replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, "") || null;
}

// Practical ASCII mailbox syntax: dot-atom local part and DNS domain labels.
// Syntax plus the configured product policy; never proof of mailbox existence.
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
  if (!allowedSuffixes.has(labels[labels.length - 1].toLowerCase())) return "This email suffix is not supported by our contact policy. Use a public email domain or leave the email blank.";
  if (isDisposableEmail(email)) return "Disposable email providers are not accepted for developer contacts. Use a lasting email address or leave it blank.";
  return null;
}
