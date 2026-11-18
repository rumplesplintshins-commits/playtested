const socialAccounts = [
  { label: "X", href: "https://x.com/PlaytestedLive" },
  { label: "Bluesky", href: "https://bsky.app/profile/playtestedofficial.bsky.social" },
  { label: "TikTok", href: "https://www.tiktok.com/@playtestedofficial" },
];

export default function SocialLinks() {
  return (
    <nav aria-label="Playtested on social media" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-300">
      {socialAccounts.map(({ label, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-6 items-center rounded underline-offset-4 hover:text-emerald-300 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300"
        >
          {label}<span className="sr-only"> (opens in a new tab)</span>
        </a>
      ))}
    </nav>
  );
}
