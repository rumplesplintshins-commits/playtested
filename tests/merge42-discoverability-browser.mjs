import assert from "node:assert/strict";
import net from "node:net";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { startMockPublicSupabase } from "./helpers/mock-public-supabase.mjs";

const port = 32830;
const mock = await startMockPublicSupabase();
const origin = `http://127.0.0.1:${port}`;
await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once("error", reject);
  probe.listen(port, "127.0.0.1", () => probe.close(resolve));
});

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:32829",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "isolated-browser-test-key",
  },
});
let logs = "";
server.stdout.on("data", data => logs += data);
server.stderr.on("data", data => logs += data);
let browser;

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const response = await fetch(origin);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert(ready, "Next server did not start: " + logs.slice(-1500));

  const initialHtml = await fetch(origin).then(response => response.text());
  assert(initialHtml.includes("Mock Adventure"), "first-page game title must exist in initial HTML");
  assert(initialHtml.includes("An isolated mock listing used only for browser regression tests."), "game description must exist in initial HTML");
  assert(initialHtml.includes("Puzzle"), "game genre must exist in initial HTML");
  assert(initialHtml.includes('href="/games/steam-912345"'), "Steam listing must have a crawlable internal profile link");
  assert.equal(mock.getCatalogueCalls(), 1, "server rendering should fetch one first catalogue page");

  browser = await chromium.launch({ headless: true });
  const noJsContext = await browser.newContext({ javaScriptEnabled: false });
  const noJsPage = await noJsContext.newPage();
  const noJsResponse = await noJsPage.goto(origin, { waitUntil: "domcontentloaded" });
  assert.equal(noJsResponse.status(), 200);
  await noJsPage.getByRole("heading", { name: "Mock Adventure" }).waitFor();
  assert(await noJsPage.locator('a[href="/games/steam-912345"]').count() > 0, "game link must render without JavaScript");
  await noJsContext.close();

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Mock Adventure" }).waitFor();
  await page.waitForTimeout(800);
  assert.equal(mock.getCatalogueCalls(), 1, "client hydration must reuse the server page without another catalogue RPC");

  for (const width of [320, 390, 853, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), `catalogue should not overflow at ${width}px effective width`);
  }

  await page.getByRole("searchbox", { name: "Search games" }).fill("Mock Approved");
  await page.waitForFunction(() => document.querySelectorAll("#discover-games [data-catalogue-density] > article").length === 1);
  assert.equal(mock.getCatalogueCalls(), 2, "search should fetch filtered catalogue results");

  const profile = await context.newPage();
  const profileResponse = await profile.goto(`${origin}/games/steam-912345`, { waitUntil: "domcontentloaded" });
  assert.equal(profileResponse.status(), 200, "eligible unlinked Steam listing should render");
  assert.equal(await profile.locator('link[rel="canonical"]').getAttribute("href"), "https://playtested.co.uk/games/steam-912345");
  assert.equal(await profile.locator("h1").textContent(), "Mock Adventure");
  assert((await profile.locator("main").innerText()).includes("An isolated mock listing used only for browser regression tests."));
  const schema = await profile.locator('script[type="application/ld+json"]').allTextContents();
  assert(schema.some(value => JSON.parse(value)["@type"] === "VideoGame"), "unlinked listing should have truthful game structured data");
  assert(await profile.getByRole("navigation", { name: "Playtesting guides" }).isVisible(), "game listing should link to relevant guides");

  const sitemapResponse = await context.request.get(`${origin}/sitemap.xml`);
  assert.equal(sitemapResponse.status(), 200);
  const sitemap = await sitemapResponse.text();
  assert(sitemap.includes("https://playtested.co.uk/games/steam-912345"), "eligible Steam catalogue entry should be in sitemap");
  assert(sitemap.includes("https://playtested.co.uk/submissions/f4200000-0000-4000-8000-000000000002"), "approved game should remain in sitemap");
  assert(!sitemap.includes("steam-999999"), "non-catalogue fixture must not appear in sitemap");
  assert.equal(new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1])).size, [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].length, "sitemap should not contain duplicate URLs");

  const missing = await context.request.get(`${origin}/games/steam-999999`);
  assert.equal(missing.status(), 404, "ineligible/nonexistent listing should remain unavailable");
  assert.deepEqual(pageErrors, [], "browser hydration should not produce client errors");
  await context.close();
  console.log("PASS Merge 42: initial HTML, no-JS discovery, hydration query reuse, interactions, mobile/zoom widths, Steam sitemap and public-only profile content");
} finally {
  if (browser) await browser.close();
  server.kill();
  await mock.close();
}
