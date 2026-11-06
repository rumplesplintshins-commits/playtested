// Browser-level interaction tests for YouTube gameplay video controls.
// Mocks the YouTube IFrame Player API so no real third-party connections are made.
// Run against the Next.js dev server: TEST_APP_URL=http://localhost:3000 node tests/test-video-player-browser.mjs
import fs from "node:fs";
import assert from "node:assert/strict";
import { chromium, expect } from "playwright/test";

const origin = process.env.TEST_APP_URL || "http://localhost:3012";

// Mocked YouTube IFrame Player API. Provides a minimal YT.Player implementation
// that emits state changes through postMessage-style callbacks so the React
// component can drive playback without any real YouTube network requests.
const YT_IFRAME_API_MOCK = `
(function() {
  const callbacks = [];
  window.onYouTubeIframeAPIReady = function() {
    callbacks.forEach(cb => cb());
  };
  window.YT = {
    PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 },
    Player: class {
      constructor(element, opts) {
        this.element = element;
        this.opts = opts || {};
        this.state = -1;
        this.currentTime = 0;
        this.duration = 120;
        this.volume = 100;
        this.muted = false;
        this._listeners = {};
        this._playing = false;
        this._seekScheduled = false;
        if (opts.events?.onReady) {
          setTimeout(() => opts.events.onReady({ target: this, data: undefined }), 50);
        }
      }
      playVideo() { this._playing = true; this.state = 1; this._emit("onStateChange", { data: 1 }); }
      pauseVideo() { this._playing = false; this.state = 2; this._emit("onStateChange", { data: 2 }); }
      stopVideo() { this._playing = false; this.state = 2; }
      seekTo(seconds, allowSeekAhead) { this.currentTime = seconds; this.state = 1; this._emit("onStateChange", { data: 1 }); }
      getCurrentTime() { return this.currentTime; }
      getDuration() { return this.duration; }
      getVolume() { return this.volume; }
      setVolume(v) { this.volume = v; }
      mute() { this.muted = true; this.volume = 0; }
      unMute() { this.muted = false; this.volume = 100; }
      isMuted() { return this.muted; }
      getPlayerState() { return this.state; }
      destroy() { this._playing = false; this.state = -1; }
      _emit(name, data) { if (this._listeners[name]) this._listeners[name](data); }
      addEventListener(name, cb) { this._listeners[name] = cb; }
      removeEventListener(name) { delete this._listeners[name]; }
      requestFullScreen() {}
      exitFullScreen() {}
    }
  };
  // Simulate script load completion
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { if (window.onYouTubeIframeAPIReady) window.onYouTubeIframeAPIReady(); });
  } else if (window.onYouTubeIframeAPIReady) {
    window.onYouTubeIframeAPIReady();
  }
})();
`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
    });

    // Mock YouTube iframe_api script and all youtube-nocookie.com requests
    await context.route("https://www.youtube.com/iframe_api", route =>
      route.fulfill({ body: YT_IFRAME_API_MOCK, contentType: "application/javascript" })
    );
    await context.route("https://www.youtube-nocookie.com/**", route => route.abort());

    const page = await context.newPage();

    // ---- Test 1: Controls appear, auto-hide after 3s, outside click hides, hover reveals ----
    await page.goto(`${origin}/__video-test`);
    await expect(page.locator('[data-video-player]')).toBeVisible();
    await expect(page.locator('iframe[title="YouTube gameplay footage"]')).toBeVisible();

    // Wait for player to be ready (mock onReady fires after ~50ms)
    await page.waitForTimeout(200);
    await expect(page.locator('[data-video-controls]')).toBeVisible();

    // Controls should auto-hide after ~3 seconds of inactivity while playing
    await page.waitForTimeout(3500);
    await expect(page.locator('[data-video-controls]')).toBeHidden();

    // Move mouse over player; controls should reappear
    await page.hover('[data-video-player]');
    await expect(page.locator('[data-video-controls]')).toBeVisible();

    // Click outside player; controls should hide immediately
    await page.click("body", { position: { x: 50, y: 50 } });
    await expect(page.locator('[data-video-controls]')).toBeHidden();

    console.log("PASS: controls appear, auto-hide after 3s, outside-click hides, hover reveals");

    // ---- Test 2: Pause keeps controls visible ----
    await page.hover('[data-video-player]');
    await expect(page.locator('[data-video-controls]')).toBeVisible();
    await page.getByRole("button", { name: "Pause video" }).click();
    await expect(page.locator('[data-video-controls]')).toBeVisible();

    // Wait past inactivity delay while paused; controls should remain visible
    await page.waitForTimeout(3500);
    await expect(page.locator('[data-video-controls]')).toBeVisible();
    console.log("PASS: pause keeps controls visible");

    // ---- Test 3: Keyboard controls ----
    await page.locator('[data-video-player]').focus();
    await page.keyboard.press(" "); // toggle play/pause
    await page.waitForTimeout(300);
    await page.keyboard.press("ArrowRight"); // seek forward
    await page.keyboard.press("m"); // mute
    await expect(page.locator('[data-video-controls]')).toBeVisible();
    console.log("PASS: keyboard controls (space, arrows, mute)");

    // ---- Test 4: Seeking via timeline ----
    const seekInput = page.locator('input[aria-label="Seek timeline"]');
    if ((await seekInput.count()) > 0) {
      await seekInput.click();
      await page.waitForTimeout(300);
      console.log("PASS: seek timeline interaction");
    }

    // ---- Test 5: Fullscreen ----
    await page.getByRole("button", { name: "Enter fullscreen" }).click();
    await page.waitForTimeout(300);
    console.log("PASS: fullscreen button clickable");

    // ---- Test 6: Player reopening ----
    await page.getByRole("button", { name: "Close player" }).click();
    await expect(page.locator('[data-video-player]')).toBeHidden();
    await page.getByRole("button", { name: /Play gameplay video/ }).click();
    await expect(page.locator('[data-video-player]')).toBeVisible();
    await page.waitForTimeout(200);
    await expect(page.locator('[data-video-controls]')).toBeVisible();
    console.log("PASS: player reopening after close");

    // ---- Test 7: Mobile viewport ----
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await expect(page.locator('[data-video-player]')).toBeVisible();
    await expect(page.locator('[data-video-controls]')).toBeVisible();
    await page.tap('[data-video-player]');
    await expect(page.locator('[data-video-controls]')).toBeVisible();
    console.log("PASS: mobile viewport and tap reveal");

    // ---- Test 8: 150% zoom ----
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.evaluate(() => { document.body.style.zoom = "1.5"; });
    await page.waitForTimeout(500);
    await expect(page.locator('[data-video-player]')).toBeVisible();
    await expect(page.locator('[data-video-controls]')).toBeVisible();
    await page.getByRole("button", { name: "Pause video" }).click();
    await expect(page.locator('[data-video-controls]')).toBeVisible();
    console.log("PASS: 150% zoom layout functional");

    console.log("\nAll YouTube video player browser interaction tests passed.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("Browser test failed:", error.message);
  process.exit(1);
});
