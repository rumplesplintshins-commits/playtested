import type { Metadata } from "next";

export const organicOrigin = "https://playtested.co.uk";
export const organicPages = [
  { path: "/playtesting", title: "What Is Playtesting? A Practical Game Playtest Guide", description: "Learn what a playtest reveals, how playtesting differs from QA, and how developers and players can turn game feedback into useful decisions." },
  { path: "/find-playtesters", title: "Find Playtesters for Your Indie Game", description: "Plan an indie game playtest, recruit suitable playtesters and ask focused questions that turn player feedback into your next development decision." },
  { path: "/become-a-playtester", title: "Become a Playtester: Test Games and Give Useful Feedback", description: "Learn how to start playtesting indie games, check a test brief and write helpful feedback. Understand access requirements and avoid promises of paid work." },
  { path: "/guides/playtest-feedback", title: "How to Write Useful Playtest Feedback", description: "Use a practical playtest feedback template to describe gameplay, performance and bugs with clear examples, reproduction steps and build context." },
] as const;

export function organicMetadata(path: string): Metadata {
  const page = organicPages.find(page => page.path === path);
  if (!page) throw new Error("Unknown editorial page");
  const title = `${page.title} | Playtested`;
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
