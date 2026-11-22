import type { Metadata } from "next";

export const organicOrigin = "https://playtested.co.uk";
export const organicPages = [
  { path: "/playtesting", title: "Indie Game Playtesting Platform", description: "Playtested connects indie developers with testers. Get structured feedback on enjoyment, bugs, gameplay and performance. Free plan available." },
  { path: "/find-playtesters", title: "How to Find Playtesters for Your Indie Game", description: "Practical ways to find playtesters for your indie game, from communities and demos to structured playtesting platforms. Start with a clear testing goal." },
  { path: "/become-a-playtester", title: "Become a Playtester – Play Indie Games & Earn XP", description: "Join Playtested as a tester. Try indie games before release, give structured feedback, earn XP and climb tester ranks. Free to sign up." },
  { path: "/guides/playtest-feedback", title: "How to Get Useful Playtest Feedback", description: "How to collect playtest feedback you can act on: what to ask, how to structure reports, and how to spot what matters most." },
] as const;

export function publicContentSitemapEntries() {
  return [
    { url: `${organicOrigin}/community` },
    ...organicPages.map(page => ({ url: organicOrigin + page.path })),
  ];
}

export function organicMetadata(path: string): Metadata {
  const page = organicPages.find(page => page.path === path);
  if (!page) throw new Error("Unknown editorial page");
  const title = page.title;
  return { title: { absolute: title }, description: page.description,
    alternates: { canonical: organicOrigin + page.path },
    openGraph: { type: "website", locale: "en_GB", siteName: "Playtested", title, description: page.description, url: organicOrigin + page.path,
      images: [{ url: organicOrigin + "/seo-social.png", width: 1200, height: 630, alt: "Playtested — playtesting and player feedback" }] },
    twitter: { card: "summary_large_image", title, description: page.description, images: [organicOrigin + "/seo-social.png"] },
  };
}

export function organicBreadcrumb(path: string, label: string) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Playtested", item: organicOrigin },
    ...(path.startsWith("/guides/") ? [{ "@type": "ListItem", position: 2, name: "Playtesting", item: organicOrigin + "/playtesting" }] : []),
    { "@type": "ListItem", position: path.startsWith("/guides/") ? 3 : 2, name: label, item: organicOrigin + path },
  ] };
}

export function safeStructuredData(value: unknown) { return JSON.stringify(value).replace(/</g, "\\u003c"); }
