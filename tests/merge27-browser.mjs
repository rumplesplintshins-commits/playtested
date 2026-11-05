import assert from "node:assert/strict";
import net from "node:net";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = 32727;
await new Promise((resolve, reject) => { const probe = net.createServer(); probe.once("error", reject); probe.listen(port, "127.0.0.1", () => probe.close(resolve)); });
const origin = `http://127.0.0.1:${port}`;
const paths = ["/playtesting", "/find-playtesters", "/become-a-playtester", "/guides/playtest-feedback"];
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { stdio: ["ignore", "pipe", "pipe"], env: process.env });
let logs = "";
server.stdout.on("data", data => logs += data);
server.stderr.on("data", data => logs += data);
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) { try { const response = await fetch(origin + paths[0]); if (response.ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 250)); }
  assert(ready, "Next server not ready: " + logs.slice(-1200));
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const path of paths) {
    const response = await page.goto(origin + path, { waitUntil: "domcontentloaded" });
    assert.equal(response.status(), 200, path + " response");
    assert.equal(await page.locator("h1").count(), 1, path + " must have one H1");
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://playtested.co.uk" + path);
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    assert(schemas.some(schema => JSON.parse(schema)["@type"] === "BreadcrumbList"), path + " breadcrumb JSON-LD");
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const zoom of ["1", "1.5"]) {
        await page.evaluate(value => { document.body.style.zoom = value; }, zoom);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), path + " horizontal overflow at " + width + "/" + zoom);
      }
    }
    await page.evaluate(() => { document.body.style.zoom = "1"; });
    const links = await page.locator('a[href^="/"]').evaluateAll(elements => [...new Set(elements.map(el => el.getAttribute("href").split("#")[0]).filter(Boolean))]);
    for (const href of links.filter(href => paths.includes(href))) {
      const result = await context.request.get(origin + href);
      assert.equal(result.status(), 200, path + " broken guide link " + href);
    }
  }
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
  server.kill();
}
