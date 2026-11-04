import policy from "./contact-email-policy.json";
const DISPOSABLE_EMAIL_DOMAINS = new Set(policy.blockedProviders);

export function getEmailDomain(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  const atIndex = normalizedEmail.lastIndexOf("@");

  if (atIndex === -1) {
    return "";
  }

  return normalizedEmail.slice(atIndex + 1);
}

export function isDisposableEmail(email: string): boolean {
  const domain = getEmailDomain(email);

  if (!domain) {
    return false;
  }

  return [...DISPOSABLE_EMAIL_DOMAINS].some(provider => domain === provider || domain.endsWith(`.${provider}`));
}
