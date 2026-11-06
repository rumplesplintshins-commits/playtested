import assert from "node:assert/strict";
import net from "node:net";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = 32727;
const externalOrigin = process.env.MERGE27_BASE_URL?.replace(/\/+$/, "");
if (!externalOrigin) await new Promise((resolve, reject) => { const probe = net.createServer(); probe.once("error", reject); probe.listen(port, "127.0.0.1", () => probe.close(resolve)); });
const origin = externalOrigin || `http://127.0.0.1:${port}`;
const paths = ["/playtesting", "/find-playtesters", "/become-a-playtester", "/guides/playtest-feedback"];
const server = externalOrigin ? null : spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { stdio: ["ignore", "pipe", "pipe"], env: process.env });
let logs = "";
server?.stdout.on("data", data => logs += data);
server?.stderr.on("data", data => logs += data);
let browser;
try {
  if (!externalOrigin) {
    let ready = false;
    for (let i = 0; i < 100; i++) { try { const response = await fetch(origin + paths[0]); if (response.ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 250)); }
    assert(ready, "Next server not ready: " + logs.slice(-1200));
  }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  const robots = await context.request.get(origin + "/robots.txt");
  assert.equal(robots.status(), 200, "robots.txt response");
  const robotsText = await robots.text();
  assert(robotsText.includes("Allow: /"), "robots.txt must allow public pages");
  assert(robotsText.includes("Disallow: /api/"), "robots.txt must exclude API routes");
  assert(robotsText.includes("https://playtested.co.uk/sitemap.xml"), "robots.txt sitemap URL");

  const socialImage = await context.request.get(origin + "/seo-social.png");
  assert.equal(socialImage.status(), 200, "SEO social image response");
  assert((socialImage.headers()["content-type"] || "").includes("image/png"), "SEO social image PNG content type");
  const socialBytes = await socialImage.body();
  assert.equal(socialBytes.readUInt32BE(16), 1200, "SEO social image width");
  assert.equal(socialBytes.readUInt32BE(20), 630, "SEO social image height");

  const appleIcon = await context.request.get(origin + "/apple-icon");
  assert.equal(appleIcon.status(), 200, "Apple touch icon response");
  assert((appleIcon.headers()["content-type"] || "").includes("image/png"), "Apple touch icon PNG content type");
  const appleBytes = await appleIcon.body();
  assert.equal(appleBytes.readUInt32BE(16), 180, "Apple touch icon width");
  assert.equal(appleBytes.readUInt32BE(20), 180, "Apple touch icon height");

  for (const path of paths) {
    const response = await page.goto(origin + path, { waitUntil: "domcontentloaded" });
    assert.equal(response.status(), 200, path + " response");
    assert.equal(response.url(), origin + path, path + " should not redirect");
    assert.equal(await page.locator("h1").count(), 1, path + " must have one H1");
    assert((await page.title()).endsWith(" | Playtested"), path + " title");
    assert((await page.locator('meta[name="description"]').getAttribute("content") || "").length >= 80, path + " description");
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://playtested.co.uk" + path);
    assert.equal(await page.locator('meta[property="og:url"]').getAttribute("content"), "https://playtested.co.uk" + path);
    assert.equal(await page.locator('meta[property="og:image"]').getAttribute("content"), "https://playtested.co.uk/seo-social.png");
    assert.equal(await page.locator('meta[name="twitter:image"]').getAttribute("content"), "https://playtested.co.uk/seo-social.png");
    assert.equal(await page.locator('meta[name="twitter:card"]').getAttribute("content"), "summary_large_image");
    const robotsContent = await page.locator('meta[name="robots"]').getAttribute("content").catch(() => null);
    assert(!/noindex/i.test(robotsContent || ""), path + " must be indexable");
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    assert(schemas.some(schema => JSON.parse(schema)["@type"] === "BreadcrumbList"), path + " breadcrumb JSON-LD");
    assert.equal(await page.locator('nav[aria-label="Breadcrumb"] [aria-current="page"]').count(), 1, path + " accessible breadcrumb current page");
    assert.equal(await page.locator("img:not([alt])").count(), 0, path + " images must have alt attributes");
    const unnamedLinks = await page.locator("main a[href]").evaluateAll(elements => elements.filter(el => !(el.innerText.trim() || el.getAttribute("aria-label") || [...el.querySelectorAll("img[alt]")].some(img => img.getAttribute("alt").trim()))).length);
    assert.equal(unnamedLinks, 0, path + " links must have accessible names");

    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("href")), "#guide-content", path + " first keyboard target must be skip link");
    assert(await page.getByRole("link", { name: "Skip to guide" }).isVisible(), path + " focused skip link must be visible");
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => location.hash), "#guide-content", path + " skip link target");

    for (const width of [260, 390, 853, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), path + " horizontal overflow at effective viewport width " + width);
    }
  }
  const internalLinks = await page.locator("a[href]").evaluateAll(elements => [...new Set(elements.map(el => {
    const url = new URL(el.href);
    return url.origin === location.origin ? url.pathname + url.search : null;
  }).filter(Boolean))]);
  for (const href of internalLinks) {
    const result = await context.request.get(origin + href);
    assert.equal(result.status(), 200, "broken internal guide link " + href);
  }
  assert.equal(appleIcon.headers()["x-powered-by"], undefined, "X-Powered-By header must be disabled");
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  for (const path of paths) {
    const p = await noJs.newPage();
    assert.equal((await p.goto(origin + path)).status(), 200);
    assert((await p.locator("main").innerText()).length > 500, path + " server-rendered text");
    await p.close();
  }
  await noJs.close();
  assert.deepEqual(errors, [], "Browser errors");
  console.log("PASS Merge 27: four guides, metadata, JSON-LD, responsive layouts, no-JS and guide links");
} finally {
  if (browser) await browser.close();
  server?.kill();
}
