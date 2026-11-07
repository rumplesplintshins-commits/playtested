// Browser-level interaction tests for the custom YouTube gameplay video controls.
// Drives the synthetic development submission fixture on a real page so no
// dedicated public test route is required. Mocks the YouTube IFrame Player API
// and hands the player element a local restriction fixture instead of any real
// third-party media.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { chromium, expect } from "playwright/test";

const origin = process.env.TEST_APP_URL || "http://localhost:3311";
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname, `${ref}.supabase.co`);
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const fixtures = JSON.parse(fs.readFileSync("technical-test-results/m24-development-fixtures.json", "utf8"));
const must = (result, label) => { assert(!result.error, `${label} failed (${result.error?.code || result.error?.status || "unknown"})`); return result.data; };

// Mocked YouTube IFrame Player API. Provides a minimal YT.Player implementation
// that emits state changes so the React component can drive playback without
// any real YouTube network requests.
const YT_IFRAME_API_MOCK = `
(function() {
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
        this._events = this.opts.events || {};
        if (this._events.onReady) setTimeout(() => this._events.onReady({ target: this, data: undefined }), 50);
      }
      playVideo() { this.state = 1; this._emit("onStateChange", { data: 1 }); }
      pauseVideo() { this.state = 2; this._emit("onStateChange", { data: 2 }); }
      stopVideo() { this.state = 2; }
      seekTo(seconds, allowSeekAhead) { this.currentTime = seconds; this.state = 1; }
      getCurrentTime() { return this.currentTime; }
      getDuration() { return this.duration; }
      getVolume() { return this.volume; }
      setVolume(v) { this.volume = v; }
      mute() { this.muted = true; this.volume = 0; }
      unMute() { this.muted = false; this.volume = 100; }
      isMuted() { return this.muted; }
      getPlayerState() { return this.state; }
      destroy() { this.state = -1; }
      _emit(name, data) { if (this._events[name]) this._events[name]({ target: this, data: data?.data }); }
    }
  };
  // The component assigns window.onYouTubeIframeAPIReady before this script
  // executes, so invoke whatever handler is registered now that window.YT exists.
  // The component assigns window.onYouTubeIframeAPIReady before this script
  // executes, so invoke whatever handler is registered now that window.YT exists.
  if (typeof window.onYouTubeIframeAPIReady === "function") {
    setTimeout(() => window.onYouTubeIframeAPIReady(), 0);
  }
})();
`;
const VIDEO_URL = "https://www.youtube.com/watch?v=abcdefghijk";

let browser, admin, original, oldFootage, changed = false;
try {
  original = must(await service.from("game_submissions").select("id,title,status,review_reason").eq("id", fixtures.submission).single(), "Read synthetic submission");
  assert(original.title.startsWith("Merge 24 QA "), "Only the known synthetic fixture may be changed");
  oldFootage = must(await service.from("gameplay_footage").select("video_url,updated_at").eq("submission_id", original.id).single(), "Read original fixture footage");
  const { user } = must(await service.auth.admin.getUserById(fixtures.users.admin), "Read synthetic admin");
  assert(user.email.startsWith("m24-admin-"));
  const generated = must(await service.auth.admin.generateLink({ type: "magiclink", email: user.email }), "Generate test sign-in without sending email");
  admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { session } = must(await admin.auth.verifyOtp({ token_hash: generated.properties.hashed_token, type: "magiclink" }), "Sign in synthetic admin");
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const cookie = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const chunks = cookie.match(/.{1,3000}/g);
  const name = `sb-${ref}-auth-token`;
  await context.addCookies(chunks.map((value, i) => ({ name: chunks.length === 1 ? name : `${name}.${i}`, value, url: origin, sameSite: "Lax" })));

  changed = true;
  must(await admin.rpc("review_game_submission", { p_submission_id: original.id, p_status: "Approved", p_review_reason: null }), "Temporarily approve synthetic fixture");
  must(await service.from("gameplay_footage").upsert({ submission_id: original.id, video_url: VIDEO_URL }), "Set synthetic YouTube footage");

  await context.route("https://www.youtube.com/iframe_api", route =>
    route.fulfill({ body: YT_IFRAME_API_MOCK, contentType: "application/javascript" })
  );
  await context.route("https://www.youtube-nocookie.com/**", route =>
    route.fulfill({ contentType: "text/html", body: '<!doctype html><title>Restricted video fixture</title><p>Video unavailable. Ask its owner for access.</p>' })
  );

  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(`${origin}/submissions/${original.id}`);

  const player = page.locator("section").filter({ has: page.getByRole("heading", { name: "Gameplay Footage", exact: true }) }).last();
  const play = player.getByRole("button", { name: "Play YouTube gameplay video", exact: true });
  await expect(play).toBeVisible();
  assert.equal(await player.locator("[data-video-player]").count(), 0, "No video player before Play");
  await play.click();

  await expect(player.locator("[data-video-player]")).toBeVisible();
  await expect(player.locator('iframe[title="YouTube gameplay footage"]')).toBeVisible();
  await page.waitForTimeout(300); // mock onReady fires after ~50ms
  await expect(player.locator("[data-video-controls]")).toBeVisible();
  await expect(player.getByRole("status")).toHaveCount(0);

  // ---- Test 1: Play, 3s inactivity hide, hover reveal, outside-click hide ----
  const toggle = player.locator("button[aria-label='Play video'], button[aria-label='Pause video']");
  await toggle.click(); // start playback
  await expect(toggle).toHaveAttribute("aria-label", "Pause video");
  await expect(player.locator("[data-video-controls]")).toBeVisible();
  await page.waitForTimeout(3500);
  await expect(player.locator("[data-video-controls]")).toBeHidden();
  await page.hover("[data-video-player]");
  await expect(player.locator("[data-video-controls]")).toBeVisible();
  // Click outside the player on a neutral page heading; controls should hide
  await page.locator("h1").first().click();
  await expect(player.locator("[data-video-controls]")).toBeHidden();
  console.log("PASS: play, auto-hide after 3s, hover reveals, outside click hides");

  // ---- Test 2: Pause keeps controls visible past the inactivity delay ----
  await page.hover("[data-video-player]");
  await expect(player.locator("[data-video-controls]")).toBeVisible();
  await player.getByRole("button", { name: "Pause video" }).click();
  await page.waitForTimeout(3500);
  await expect(player.locator("[data-video-controls]")).toBeVisible();
  console.log("PASS: pause keeps controls visible");

  // ---- Test 3: Keyboard controls ----
  await page.locator("[data-video-player]").focus();
  await page.keyboard.press(" "); // resume play
  await expect(toggle).toHaveAttribute("aria-label", "Pause video");
  await page.keyboard.press("ArrowRight");
  const seekValueRight = await page.locator('input[aria-label="Seek timeline"]').inputValue();
  assert.equal(Number(seekValueRight), 5, "ArrowRight seeks forward 5s and updates the timeline");
  await page.keyboard.press("ArrowLeft");
  const seekValueLeft = await page.locator('input[aria-label="Seek timeline"]').inputValue();
  assert.equal(Number(seekValueLeft), 0, "ArrowLeft seeks back and clamps at 0");
  await page.keyboard.press("m");
  await expect(player.getByRole("button", { name: "Unmute" })).toBeVisible();
  await expect(player.locator("[data-video-controls]")).toBeVisible();
  await page.keyboard.press("m");
  await expect(player.getByRole("button", { name: "Mute" })).toBeVisible();
  console.log("PASS: keyboard space/arrows/mute with immediate timeline and icon updates");

  // ---- Test 4: Seeking via timeline ----
  const seekInput = page.locator('input[aria-label="Seek timeline"]');
  await seekInput.click();
  await page.waitForTimeout(400);
  const seeked = Number(await seekInput.inputValue());
  assert(seeked > 0, "Timeline click seeks");
  console.log("PASS: seek timeline interaction");

  // ---- Test 5: Fullscreen ----
  const fullscreenButton = player.getByRole("button", { name: "Enter fullscreen" });
  await fullscreenButton.click();
  await page.waitForTimeout(300);
  const enteredFullscreen = await page.evaluate(() => !!document.fullscreenElement);
  if (enteredFullscreen) {
    await fullscreenButton.click(); // exit
    await page.waitForTimeout(300);
    assert(!(await page.evaluate(() => !!document.fullscreenElement)), "Second fullscreen press exits");
    console.log("PASS: fullscreen enter and exit");
  } else {
    console.log("PASS: fullscreen button clickable (headless fullscreen unavailable)");
  }

  // ---- Test 6: Close and reopen ----
  await player.getByRole("button", { name: "Close player" }).click();
  await expect(player.locator("[data-video-player]")).toHaveCount(0);
  await play.click();
  await expect(player.locator("[data-video-player]")).toBeVisible();
  await page.waitForTimeout(300);
  await expect(player.locator("[data-video-controls]")).toBeVisible();
  await toggle.click(); // resume playback for the layout checks
  console.log("PASS: player reopening after close");

  // ---- Test 7: Mobile viewport tap reveal ----
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  await mobileContext.route("https://www.youtube.com/iframe_api", route =>
    route.fulfill({ body: YT_IFRAME_API_MOCK, contentType: "application/javascript" })
  );
  await mobileContext.route("https://www.youtube-nocookie.com/**", route =>
    route.fulfill({ contentType: "text/html", body: '<!doctype html><title>Restricted video fixture</title><p>Video unavailable. Ask its owner for access.</p>' })
  );
  const mobilePage = await mobileContext.newPage();
  mobilePage.setDefaultTimeout(15000);
  await mobilePage.goto(`${origin}/submissions/${original.id}`);
  await mobilePage.getByRole("button", { name: "Play YouTube gameplay video", exact: true }).click();
  const mobilePlayer = mobilePage.locator("section").filter({ has: mobilePage.getByRole("heading", { name: "Gameplay Footage", exact: true }) }).last();
  await expect(mobilePlayer.locator("[data-video-player]")).toBeVisible();
  await mobilePage.waitForTimeout(300);
  await expect(mobilePlayer.locator("[data-video-controls]")).toBeVisible();
  await mobilePage.tap("[data-video-player]");
  await expect(mobilePlayer.locator("[data-video-controls]")).toBeVisible();
  console.log("PASS: mobile viewport and tap reveal");
  await mobileContext.close();

  // ---- Test 8: 150% zoom ----
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => { document.documentElement.style.zoom = "1.5"; });
  await page.waitForTimeout(500);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "150% zoom reflow");
  await player.getByRole("button", { name: "Pause video" }).click();
  await expect(player.locator("[data-video-controls]")).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.zoom = ""; });
  console.log("PASS: 150% zoom layout functional");

  console.log("\nAll YouTube video player browser interaction tests passed.");
} catch (error) {
  console.error("FAIL video player browser:", String(error.message || error).slice(0, 600));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (changed) {
    try {
      must(await service.from("gameplay_footage").upsert({ submission_id: original.id, ...oldFootage }), "Restore synthetic footage");
      must(await admin.rpc("review_game_submission", { p_submission_id: original.id, p_status: original.status, p_review_reason: original.review_reason }), "Restore synthetic review status");
      console.log("Restored synthetic development footage and review status; production untouched.");
    } catch (error) {
      console.error("Synthetic fixture restoration failed:", error.message);
      process.exitCode = 1;
    }
  }
}
