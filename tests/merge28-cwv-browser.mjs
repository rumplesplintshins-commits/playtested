import assert from "node:assert/strict";
import net from "node:net";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { startMockPublicSupabase } from "./helpers/mock-public-supabase.mjs";

const port = 32828;
const mock = await startMockPublicSupabase();
const origin = `http://127.0.0.1:${port}`;
const viewports = [260, 390, 853, 1280];
const repetitions = Number(process.env.MERGE28_CLS_REPETITIONS || 3);

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
  assert(ready, "Next server did not start: " + logs.slice(-1200));

  browser = await chromium.launch({ headless: true });
  const results = [];
  let checkedProfileKinds = [];

  for (const width of viewports) {
    const samples = [];
    for (let run = 0; run < repetitions; run++) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(() => {
        window.__merge28LayoutShifts = [];
        window.__merge28HeaderHeights = [];
        new PerformanceObserver(entries => {
          for (const entry of entries.getEntries()) {
            if (!entry.hadRecentInput) window.__merge28LayoutShifts.push(entry.value);
          }
        }).observe({ type: "layout-shift", buffered: true });
        const sampleHeader = () => {
          const header = document.querySelector("header");
          if (header) window.__merge28HeaderHeights.push(header.getBoundingClientRect().height);
          requestAnimationFrame(sampleHeader);
        };
        requestAnimationFrame(sampleHeader);
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));

      const response = await page.goto(origin, { waitUntil: "domcontentloaded" });
      assert.equal(response.status(), 200, `homepage response at ${width}px`);
      await page.waitForTimeout(5000);

      const sample = await page.evaluate(() => ({
        cls: window.__merge28LayoutShifts.reduce((sum, value) => sum + value, 0),
        headerHeightRange: window.__merge28HeaderHeights.length
          ? Math.max(...window.__merge28HeaderHeights) - Math.min(...window.__merge28HeaderHeights)
          : 0,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
        cataloguePresent: Boolean(document.querySelector("#discover-games")),
        catalogueText: document.querySelector("#discover-games")?.innerText ?? "",
        catalogueCards: document.querySelectorAll("#discover-games [data-catalogue-density] > article").length,
      }));
      assert.deepEqual(errors, [], `browser errors at ${width}px`);
      assert(sample.cataloguePresent, "homepage catalogue section must remain present");
      assert.equal(sample.horizontalOverflow, false, `horizontal overflow at ${width}px`);
      if (width <= 390) assert(sample.headerHeightRange <= 1, `header height changed by ${sample.headerHeightRange}px at ${width}px`);
      const countMatch = sample.catalogueText.match(/([\d,]+) games found/);
      const catalogueCount = countMatch ? Number(countMatch[1].replaceAll(",", "")) : 0;
      const minimumCatalogueCount = Number(process.env.MERGE28_MIN_CATALOGUE_COUNT || 0);
      if (minimumCatalogueCount > 0) {
        assert(catalogueCount >= minimumCatalogueCount, `catalogue count ${catalogueCount} was below ${minimumCatalogueCount}`);
        assert(sample.catalogueCards > 0, "catalogue listings should load");
      }
      sample.catalogueCount = catalogueCount;
      samples.push(sample);

      if (width === 390 && run === 0) {
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://playtested.co.uk");
        assert.equal(await page.locator('script[type="application/ld+json"]').count(), 1);
        const homeSchema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
        assert.equal(homeSchema["@context"], "https://schema.org");
        assert(homeSchema["@graph"].some(entity => entity["@type"] === "Organization" && entity["@id"] === "https://playtested.co.uk/#organization"));
        assert(homeSchema["@graph"].some(entity => entity["@type"] === "WebSite" && entity.publisher?.["@id"] === "https://playtested.co.uk/#organization"));
        assert.equal(await page.locator('header a[href="/login"]').count(), 1, "logged-out login link");
        assert.equal(await page.locator('header a[href="/login?mode=signup"]').count(), 1, "logged-out signup link");
        assert.equal(await page.locator('a[href="/login?mode=signup&role=developer&next=/my-submissions"]').count(), 1, "developer signup return path");
        assert.equal(await page.locator('a[href="/login?mode=signup&role=tester&next=/tester"]').count(), 1, "tester signup return path");
        const menu = page.locator('header button[aria-controls="mobile-navigation"]');
        assert.equal(await menu.textContent(), "Menu☰", "mobile menu should have a visible label");
        await menu.focus();
        await page.keyboard.press("Enter");
        assert.equal(await menu.getAttribute("aria-expanded"), "true", "mobile menu should open with the keyboard");
        assert(await page.getByRole("navigation", { name: "Mobile navigation" }).isVisible(), "mobile navigation should be visible");
      }

      await context.close();
    }

    const sorted = samples.map(sample => sample.cls).sort((a, b) => a - b);
    const medianCls = sorted[Math.floor(sorted.length / 2)];
    assert(medianCls <= 0.1, `median CLS at ${width}px was ${medianCls}, expected <= 0.1`);
    results.push({ width, medianCls, runs: samples.map(sample => sample.cls), headerHeightRanges: samples.map(sample => sample.headerHeightRange), catalogueCounts: samples.map(sample => sample.catalogueCount), visibleCards: samples.map(sample => sample.catalogueCards) });
  }

  if (process.env.MERGE28_CHECK_PUBLIC_PROFILES === "1") {
    const sitemap = await fetch(origin + "/sitemap.xml");
    assert.equal(sitemap.status, 200, "public sitemap response");
    const xml = await sitemap.text();
    const sitemapUrls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
    assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, "sitemap should not contain duplicate URLs");
    for (const requiredPath of ["/community", "/playtesting", "/find-playtesters", "/become-a-playtester", "/guides/playtest-feedback"]) {
      assert(sitemapUrls.includes("https://playtested.co.uk" + requiredPath), `${requiredPath} should be included in the public sitemap`);
    }
    assert(sitemapUrls.every(url => url.startsWith("https://playtested.co.uk/")), "sitemap should contain only canonical production-origin URLs");
    const profilePaths = [...xml.matchAll(/<loc>https:\/\/playtested\.co\.uk(\/(?:games|submissions)\/[^<]+)<\/loc>/g)]
      .map(match => match[1]);
    const representativePaths = ["games", "submissions"]
      .map(kind => profilePaths.find(path => path.startsWith(`/${kind}/`)))
      .filter(Boolean);
    assert(representativePaths.length > 0, "sitemap should expose eligible public game profiles");
    checkedProfileKinds = representativePaths.map(path => path.startsWith("/games/") ? "linked Steam profile" : "approved submission profile");

    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    for (const path of representativePaths) {
      const response = await page.goto(origin + path, { waitUntil: "domcontentloaded" });
      assert.equal(response.status(), 200, `public profile ${path} response`);
      const canonical = "https://playtested.co.uk" + path;
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), canonical, `${path} canonical`);
      assert.equal(await page.locator('meta[property="og:url"]').getAttribute("content"), canonical, `${path} Open Graph URL`);
      const robots = await page.locator('meta[name="robots"]').count()
        ? await page.locator('meta[name="robots"]').getAttribute("content")
        : null;
      assert(!/noindex/i.test(robots || ""), `${path} must be indexable`);
      assert.equal(await page.locator("img:not([alt])").count(), 0, `${path} image alt text`);
      const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
      assert(schemas.some(value => {
        const schema = JSON.parse(value);
        return schema["@type"] === "VideoGame" &&
          schema.url === canonical &&
          schema.mainEntityOfPage === canonical &&
          schema.inLanguage === "en-GB";
      }), `${path} should expose truthful VideoGame JSON-LD`);
      assert(schemas.some(value => {
        const schema = JSON.parse(value);
        return schema["@type"] === "BreadcrumbList" &&
          schema.itemListElement?.[1]?.item === canonical;
      }), `${path} should expose a canonical game-profile breadcrumb`);
      assert.equal(await page.locator('nav[aria-label="Breadcrumb"] [aria-current="page"]').count(), 1, `${path} visible breadcrumb`);
      assert(await page.getByRole("navigation", { name: "Playtesting guides" }).isVisible(), `${path} guide links`);
    }
    await context.close();

    const noJsContext = await browser.newContext({ javaScriptEnabled: false });
    const noJsPage = await noJsContext.newPage();
    const noJsResponse = await noJsPage.goto(origin + representativePaths[0], { waitUntil: "domcontentloaded" });
    assert.equal(noJsResponse.status(), 200, "server-rendered public game profile response");
    assert.equal(await noJsPage.locator("h1").count(), 1, "server-rendered public game profile heading");
    assert(await noJsPage.locator('script[type="application/ld+json"]').count() > 0, "server-rendered public game schema");
    await noJsContext.close();
  }

  console.log("Merge 28 homepage CLS samples:", JSON.stringify(results), "public profile checks:", JSON.stringify(checkedProfileKinds));
} finally {
  if (browser) await browser.close();
  server.kill();
  await mock.close();
}
