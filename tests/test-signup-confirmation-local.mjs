import assert from "node:assert/strict";
import { mkdtemp, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect } from "playwright/test";

const app = new URL(process.env.TEST_APP_URL || "http://127.0.0.1:3118");
const backend = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
for (const url of [app, backend]) assert(["127.0.0.1", "localhost"].includes(url.hostname));
const extension = await mkdtemp(join(tmpdir(), "signup-zoom-"));
await writeFile(join(extension, "manifest.json"), JSON.stringify({
  manifest_version: 3, name: "Local signup zoom", version: "1.0", permissions: ["tabs"],
  background: { service_worker: "worker.js" },
}));
await writeFile(join(extension, "worker.js"), "chrome.runtime.onInstalled.addListener(() => {});");
let context;
try {
  context = await chromium.launchPersistentContext("", {
    channel: "chromium", headless: true, viewport: null,
    args: ["--window-size=1500,1000", "--disable-extensions-except=" + extension, "--load-extension=" + extension],
  });
  let signups = 0;
  let resends = 0;
  const destination = app.origin + "/auth/callback?next=%2Faccount";
  const email = "local-signup-test@example.com";
  await context.route(backend.origin + "/auth/v1/**", async route => {
    const url = new URL(route.request().url());
    const body = route.request().postDataJSON();
    assert.equal(url.searchParams.get("redirect_to"), destination);
    assert.equal(body.email, email);
    if (url.pathname.endsWith("/signup")) {
      signups++;
      if (signups === 1) return route.fulfill({ status: 422, json: { msg: "Signup temporarily unavailable" } });
      return route.fulfill({ json: { id: "copy-only-fixture", email, identities: [] } });
    }
    assert(url.pathname.endsWith("/resend"));
    assert.equal(body.type, "signup");
    resends++;
    if (resends === 1) return route.fulfill({ status: 429, json: { msg: "Rate limit exceeded" } });
    return route.fulfill({ json: {} });
  });
  const page = context.pages()[0];
  await page.clock.install();
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
  async function zoom(factor) {
    const actual = await worker.evaluate(async factor => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.setZoom(tab.id, factor);
      return chrome.tabs.getZoom(tab.id);
    }, factor);
    assert.equal(actual, factor);
    await expect.poll(() => page.evaluate(() => devicePixelRatio)).toBe(factor);
  }
  async function signup() {
    await page.goto(app.origin + "/login?mode=signup&role=developer&next=%2Faccount");
    await page.waitForFunction(() => Object.keys(document.querySelector("form") || {}).some(key => key.startsWith("__reactProps$")));
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("offline-fixture-password");
    await page.getByRole("checkbox", { name: /18 or over/ }).check();
    const form = page.locator("form");
    await form.evaluate(element => { element.requestSubmit(); element.requestSubmit(); });
  }
  await signup();
  await expect(page.getByText("Signup temporarily unavailable", { exact: true })).toBeVisible();
  assert.equal(signups, 1);
  await signup();
  const heading = page.getByRole("heading", { name: "Check your email" });
  await expect(heading).toBeFocused();
  assert.equal(signups, 2);
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await expect(page.getByText(/Check your spam or junk folder/)).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Create account" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login?next=%2Faccount");
  const resend = page.getByRole("button", { name: /Resend confirmation/ });
  await expect(resend).toBeDisabled();
  await zoom(1.5);
  await expect(heading).toBeVisible();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await zoom(1);
  await page.setViewportSize({ width: 320, height: 720 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.clock.fastForward(61_000);
  await expect(resend).toBeEnabled();
  await resend.evaluate(button => { button.click(); button.click(); });
  await expect(page.getByText("Too many requests. Wait before trying again.")).toBeVisible();
  assert.equal(resends, 1);
  await expect(resend).toBeDisabled();
  await page.clock.fastForward(61_000);
  await resend.click();
  await expect(page.getByRole("status")).toContainText("Confirmation requested");
  assert.equal(resends, 2);
  console.log("PASS signup success, duplicate prevention, resend and 429, 320px and actual 150% Chromium zoom. Auth mocked.");
} finally {
  await context?.close();
  await unlink(join(extension, "manifest.json"));
  await unlink(join(extension, "worker.js"));
  await rmdir(extension);
}
