import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { chromium, expect } from "playwright/test";

const fixture = "app/game-share-fixture";
const port = 3066;
const origin = "http://127.0.0.1:" + port;
const canonicalImported = "https://playtested.co.uk/games/steam-4";
const longTitle = "A deliberately very long independent game title used to prove that long game names wrap without breaking the hero layout";
let child, browser;
assert(!fs.existsSync(fixture), "Refuse to overwrite an existing fixture");
assert(!await fetch(origin).then(() => true).catch(() => false), "Refuse to reuse an occupied port");
fs.mkdirSync(".backup-tools", { recursive: true });
const log = fs.openSync(".backup-tools/game-share-browser.log", "a");

function captureShareScript(outcome) {
  return `
    Object.defineProperty(Navigator.prototype, "share", {
      configurable: true,
      value: ${outcome}
    });
  `;
}
const supportShare = captureShareScript("(detail) => { window.__shared = window.__shared || []; window.__shared.push(detail); return Promise.resolve(); }");
const abortShare = captureShareScript("() => Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))");
const noShare = captureShareScript("undefined");

try {
  fs.mkdirSync(fixture, { recursive: true });
  fs.writeFileSync(
    fixture + "/page.tsx",
    `import GameShareButton from "../components/GameShareButton";
import ToastHost from "../components/ToastHost";
export default function Page() {
  return (
    <main className="min-h-screen bg-[#090b0a] text-zinc-100">
      <ToastHost />
      <section data-panel="short" className="mx-auto max-w-6xl px-6 pt-10">
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <h1 id="short-hero" className="min-w-0 flex-1 break-words font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight md:text-6xl">Test Game Alpha</h1>
          <GameShareButton title="Test Game Alpha" path="/games/steam-4" />
        </div>
        <p className="mt-3 text-lg text-zinc-400">By <strong className="font-bold text-zinc-100">Studio Alpha</strong></p>
      </section>
      <section data-panel="long" className="mx-auto max-w-3xl px-6 pb-24 pt-10">
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <h1 className="min-w-0 flex-1 break-words font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">${longTitle}</h1>
          <GameShareButton title="${longTitle}" path="/submissions/3f497c69-febd-4f56-a15e-58e04ca8247f" />
        </div>
      </section>
    </main>
  );
}`
  );
  child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      stdio: ["ignore", log, log],
      windowsHide: true,
      env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "ci-public-placeholder", NEXT_TELEMETRY_DISABLED: "1" },
    }
  );
  let ready = false;
  for (let n = 0; n < 120; n++) {
    if (child.exitCode !== null) throw Error("Fixture server exited");
    if (await fetch(origin + "/game-share-fixture").then(r => r.ok).catch(() => false)) { ready = true; break; }
    await new Promise(r => setTimeout(r, 1000));
  }
  assert(ready, "Fixture server timeout");

  browser = await chromium.launch({ headless: true });

  // Supported browsers: native navigator.share receives the canonical URL.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(supportShare);
    await context.route("https://example.supabase.co/**", route => route.fulfill({ status: 200, json: {} }));
    const page = await context.newPage();
    await page.goto(origin + "/game-share-fixture");
    const share = page.locator('[data-panel="short"] [aria-haspopup="dialog"]');
    await share.click();
    await expect(share).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const shared = await page.evaluate(() => window.__shared);
    assert.equal(shared && shared.length, 1, "native share captured one payload");
    assert.equal(shared[0].url, canonicalImported, "native share must hand over the canonical Playtested URL");
    assert.equal(shared[0].title, "Test Game Alpha | Playtested", "native share title");
    await context.close();
  }

  // User cancels the native sheet: abort must keep the menu closed.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(abortShare);
    await context.route("https://example.supabase.co/**", route => route.fulfill({ status: 200, json: {} }));
    const page = await context.newPage();
    await page.goto(origin + "/game-share-fixture");
    const share = page.locator('[data-panel="short"] [aria-haspopup="dialog"]');
    await share.click();
    await expect(share).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await context.close();
  }

  // Unsupported browsers fall back to the branded menu with clipboard flows.
  const setupFallback = async function (grantClipboard) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(noShare);
    await context.route("https://example.supabase.co/**", route => route.fulfill({ status: 200, json: {} }));
    if (grantClipboard) await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
    await context.addInitScript("window.addEventListener('playtested-toast', e => { window.__toastEvents = (window.__toastEvents || []).concat([(e.detail && e.detail.message) || 'no-detail']); });");
    const page = await context.newPage();
    await page.goto(origin + "/game-share-fixture");
    return { context, page };
  };

  {
    const fallback = await setupFallback(true);
    const share = fallback.page.locator('[data-panel="short"] [aria-haspopup="dialog"]');
    await share.click();
    await expect(share).toHaveAttribute("aria-expanded", "true");
    const dialog = fallback.page.getByRole("dialog", { name: "Share Test Game Alpha" });
    await expect(dialog).toBeVisible();
    // Focus moves into the dialog with the URL pre-selected.
    assert.equal(await fallback.page.evaluate(() => { const a = document.activeElement; return a ? a.getAttribute("aria-label") : null; }), "Game link");
    assert.equal(await fallback.page.evaluate(() => document.querySelector('input[aria-label="Game link"]').value), canonicalImported, "dialog shows canonical Playtested URL");
    await expect(fallback.page.locator('input[aria-label="Game link"]')).toBeFocused();
    assert.equal(await fallback.page.evaluate(() => document.querySelector('input[aria-label="Game link"]').value), canonicalImported, "dialog shows canonical Playtested URL");
    await expect.poll(() => fallback.page.evaluate(() => String(document.querySelector('input[aria-label="Game link"]').selectionEnd)), { timeout: 2000 }).toBe(String(canonicalImported.length), "link text pre-selected on open");
    // Share button sits to the right of the title on the same row.
    const geo = await fallback.page.evaluate(() => {
      const h = document.querySelector("#short-hero").getBoundingClientRect();
      const b = document.querySelector('[data-panel="short"] [aria-haspopup="dialog"]').getBoundingClientRect();
      return { hr: h.x + h.width, hy: h.y, bx: b.x, by: b.y, br: b.x + b.width, bb: b.y + b.height, vw: innerWidth, vh: innerHeight };
    });
    assert(geo.bx >= geo.hr - 2, "share must sit to the right of the game title (share left " + geo.bx + ", title right " + geo.hr + ")");
    assert(Math.abs(geo.by - geo.hy) < 40, "share sits on the same row as the title");
    assert(geo.bx >= 0 && geo.by >= 0 && geo.br <= geo.vw && geo.bb <= geo.vh, "share menu fully inside the viewport");
    // Clipboard success reuses the Playtested toast system.
    await fallback.page.getByRole("button", { name: "Copy game link" }).click();
    // Dev mode hydration replay may double-fire the click: assert on the first toast.
    await expect(fallback.page.getByText("Game link copied").first()).toBeVisible();
    // Escape closes and returns focus to the trigger.
    await fallback.page.keyboard.press("Escape");
    await expect(fallback.page.getByRole("dialog")).toHaveCount(0);
    assert.equal(await fallback.page.evaluate(() => document.activeElement ? document.activeElement.getAttribute("aria-haspopup") : null), "dialog", "focus returns to the Share trigger after Escape");
    // Keyboard reopen, then outside click dismissal.
    await fallback.page.keyboard.press("Enter");
    await expect(fallback.page.getByRole("dialog")).toHaveCount(1);
    await fallback.page.mouse.click(10, 500);
    await expect(fallback.page.getByRole("dialog")).toHaveCount(0);
    await fallback.context.close();
  }

  // Clipboard failure feedback without permissions.
  {
    const fallback = await setupFallback(false);
    await fallback.page.locator('[data-panel="short"] [aria-haspopup="dialog"]').click();
    await fallback.page.getByRole("button", { name: "Copy game link" }).click();
    await expect(fallback.page.getByText("Copying failed", { exact: false }).first()).toBeVisible();
    await fallback.context.close();
  }

  // Long game names wrap without horizontal overflow, at mobile, 150% zoom and desktop.
  {
    const fallback = await setupFallback(true);
    for (const width of [375, 853, 1280]) {
      const page = fallback.page;
      await page.setViewportSize({ width, height: 900 });
      for (const zoom of [1, 1.5]) {
        await page.evaluate(z => { document.body.style.zoom = String(z); }, zoom);
        assert(await page.evaluate(() => (document.documentElement.scrollWidth <= window.innerWidth + 1)), "no horizontal overflow at width " + width + " zoom " + zoom);
        if (width >= 853) {
          await page.locator('[data-panel="long"] [aria-haspopup="dialog"]').click();
          const box = await page.locator('[data-panel="long"] [role="dialog"]').boundingBox();
          assert(box, "menu rendered");
          assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= 900, "long-title menu unclipped at width " + width + " zoom " + zoom);
          await page.keyboard.press("Escape");
          await expect(page.getByRole("dialog")).toHaveCount(0);
        }
      }
    }
    await fallback.context.close();
  }

  console.log("PASS game share browser: canonical native share, abort, branded fallback, clipboard success/failure toasts, Escape focus return, outside click, unclipped menu, long titles at mobile/zoom/desktop.");
} finally {
  if (browser) await browser.close();
  if (child) {
    if (process.platform === "win32") { try { execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" }); } catch {} }
    else child.kill("SIGTERM");
  }
  const cleanup = path.resolve(fixture);
  assert.equal(cleanup, path.join(process.cwd(), "app", "game-share-fixture"));
  fs.rmSync(cleanup, { recursive: true, force: true });
}
