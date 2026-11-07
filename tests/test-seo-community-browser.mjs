import assert from "node:assert/strict";
import net from "node:net";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = 32931;
const origin = `http://127.0.0.1:${port}`;
await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once("error", reject);
  probe.listen(port, "127.0.0.1", () => probe.close(resolve));
});

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
  {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "seo-test-placeholder",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "seo-test-placeholder",
    },
  }
);
let logs = "";
server.stdout.on("data", data => logs += data);
server.stderr.on("data", data => logs += data);
let browser;

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(origin + "/community")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert(ready, "Next server not ready: " + logs.slice(-1200));

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.route("https://example.supabase.co/**", async route => {
    const url = new URL(route.request().url());
    const rows = url.pathname.endsWith("/community_posts")
      ? [{
          id: 42,
          user_id: null,
          community: "general",
          title: "SEO crawler link fixture",
          body: "A public discussion fixture for semantic link testing.",
          created_at: "2026-01-01T00:00:00.000Z",
        }]
      : [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin": origin,
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "*",
      },
      body: JSON.stringify(rows),
    });
  });

  const page = await context.newPage();
  const response = await page.goto(origin + "/community", { waitUntil: "domcontentloaded" });
  assert.equal(response.status(), 200);
  assert.equal(await page.title(), "Playtested Community | Indie Game Discussions");
  assert.equal(
    await page.locator('link[rel="canonical"]').getAttribute("href"),
    "https://playtested.co.uk/community"
  );
  assert.equal(
    await page.locator('meta[name="description"]').getAttribute("content"),
    "Join Playtested community discussions about indie games, playtesting and player feedback."
  );
  const discussionLink = page.getByRole("link", { name: "SEO crawler link fixture" });
  await discussionLink.waitFor({ state: "visible", timeout: 10000 });
  assert.equal(await discussionLink.getAttribute("href"), "/community/42");
  assert.equal(
    await page.getByRole("link", { name: "0 comments" }).getAttribute("href"),
    "/community/42"
  );
  await context.close();
  console.log("PASS community discoverability: unique canonical metadata and crawlable discussion links with isolated API mocks.");
} finally {
  if (browser) await browser.close();
  server.kill();
}
