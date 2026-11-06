import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function read(path) {
  return readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
}

const pages = {
  "/playtesting": "../app/playtesting/page.tsx",
  "/find-playtesters": "../app/find-playtesters/page.tsx",
  "/become-a-playtester": "../app/become-a-playtester/page.tsx",
  "/guides/playtest-feedback": "../app/guides/playtest-feedback/page.tsx",
};

const sources = {};
for (const [path, file] of Object.entries(pages)) sources[path] = read(file);

// Canonicals and metadata stay exactly as they are.
for (const [path, source] of Object.entries(sources)) {
  assert(
    source.includes(`export const metadata = organicMetadata("${path}");`),
    path + " must keep its canonical organicMetadata"
  );
}

// FAQ answers are plain content; no rich-result chasing through structured data.
for (const [path, source] of Object.entries(sources)) {
  assert(!source.includes("FAQPage"), path + " must not add FAQPage JSON-LD");
  assert(
    !source.includes('type="application/ld+json"'),
    path + " must not add extra JSON-LD scripts"
  );
}
assert(read("../app/components/OrganicGuide.tsx").split('type="application/ld+json"').length === 2, "OrganicGuide keeps exactly its breadcrumb JSON-LD");

// Answer-first questions each page now covers.
const requiredContent = [
  ["/playtesting", "How long should a playtest session be?"],
  ["/playtesting", "Do playtesters need development experience?"],
  ["/playtesting", "Is a playtest the same as a demo?"],
  ["/find-playtesters", "If you are running a Steam Playtest"],
  ["/find-playtesters", "https://partner.steamgames.com/doc/features/playtest"],
  ["/find-playtesters", "How many playtesters do I need?"],
  ["/find-playtesters", "Where should testers send feedback?"],
  ["/find-playtesters", "Do I need to pay playtesters?"],
  ["/become-a-playtester", "Getting started with no experience"],
  ["/become-a-playtester", "What happens to my feedback after I submit it?"],
  ["/become-a-playtester", "Can a playtesting offer be a scam?"],
  ["/become-a-playtester", "Do I need a microphone or a camera?"],
  ["/guides/playtest-feedback", "What if I could not finish the build?"],
  ["/guides/playtest-feedback", "How much detail is too much?"],
  ["/guides/playtest-feedback", "How is this different from a form or a Discord thread?"],
];
for (const [path, needle] of requiredContent) {
  assert(sources[path].includes(needle), path + " must cover: " + needle);
}

// Steam Playtest advice stays tied to the official documentation.
assert(
  (sources["/find-playtesters"].match(/partner\.steamgames\.com\/doc\/features\/playtest/g) || []).length === 1,
  "the official Steam Playtest documentation link appears exactly once"
);

// The four guides cross-link each other from their main content.
for (const [path, source] of Object.entries(sources)) {
  for (const other of Object.keys(pages).filter(target => target !== path)) {
    assert(
      source.includes(`href="${other}"`),
      path + " must link to " + other
    );
  }
}

// Accessible question-and-answer layout: h3 headings and spacing exist in the guide shell.
const guide = read("../app/components/OrganicGuide.tsx");
for (const rule of ["[&_h3]:mt-7", "[&_h3]:font-semibold", "[&_h3+p]:mt-2"]) {
  assert(guide.includes(rule), "OrganicGuide must style FAQ headings: " + rule);
}

// Steam Playtest claims must credit the official docs, not invented features.
const steamSection = sources["/find-playtesters"].split("<h2>If you are running a Steam Playtest</h2>")[1] ?? "";
assert(!/unlimited|guarantee|notify you about|revenue|reviews generated/i.test(steamSection), "no invented Steam Playtest feature claims");

console.log("PASS AEO guide content: four guides keep canonical metadata, add answer-first questions, Steam Playtest guidance, cross-links, FAQ layouts and no extra JSON-LD.");
