const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "cool.fr.nf",
  "jetable.fr.nf",
  "nospam.ze.tc",
  "nomail.xl.cx",
  "mega.zik.dj",
  "speed.1s.fr",
  "courriel.fr.nf",
  "moncourrier.fr.nf",
  "monemail.fr.nf",
  "monmail.fr.nf",
  "temp-mail.org",
  "tempmail.com",
  "temp-mail.io",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamail.de",
  "sharklasers.com",
  "grr.la",
  "mailinator.com",
  "10minutemail.com",
  "10minutemail.net",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.net",
  "dispostable.com",
  "maildrop.cc",
  "getnada.com",
  "emailondeck.com",
  "mohmal.com",
]);

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

  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}