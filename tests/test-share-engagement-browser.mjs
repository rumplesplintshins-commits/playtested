import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium, expect } from 'playwright/test';

const dir = 'app/share-engagement-fixture';
const origin = process.env.TEST_APP_URL || 'http://localhost:3000';
const id = 'b1100000-0000-4000-8000-000000000010';
const cp = 'b1100000-0000-4000-8000-000000000020';

if (fs.existsSync(dir)) throw Error('Fixture exists; refusing overwrite');
fs.mkdirSync(dir);
fs.writeFileSync(
  dir + '/page.tsx',
  `import GameLinksEngagement from '../components/GameLinksEngagement';import{ShareEntry,ShareJourneyBanner,TrackedAccessLink}from'../components/ShareJourney';export default function Fixture(){return <main className="min-h-screen bg-[#090b0a] p-4 text-white"><div style={{maxWidth:620}}><GameLinksEngagement source={{kind:'imported',id:'${id}'}}/><ShareEntry id="${id}" context={{title:'Fixture game',path:'/tester?campaign=${cp}',tester_path:'/tester?campaign=${cp}',tags:{source:'reddit',medium:'social',campaign:'demo'}}}/><ShareJourneyBanner/><TrackedAccessLink href="https://example.test/game" campaignId="${cp}" target="_blank">Open fixture game</TrackedAccessLink></div></main>}`,
);

const browser = await chromium.launch({ headless: true });
let entries = [];
let rows = [];
let created = [];
let engagementRequests = 0;
let reads = 0;

try {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  await context.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin === origin) {
      if (url.pathname === '/api/engagement') {
        engagementRequests++;
        return route.fulfill({ status: 410, json: { disabled: true } });
      }
      return route.continue();
    }
    if (!url.pathname.includes('/rest/v1/rpc/')) return route.abort();
    const body = req.postDataJSON();
    const name = url.pathname.split('/').at(-1);
    if (['get_share_context', 'get_share_engagement'].includes(name)) reads++;
    let data;
    if (name === 'get_share_context') data = { public_path: '/games/steam-110', campaigns: [{ id: cp, label: 'Build fixture' }] };
    else if (name === 'get_share_engagement') data = { links: entries, breakdown: rows };
    else if (name === 'create_share_link') {
      created.push(body);
      entries.push({ id, source: body.p_source, medium: body.p_medium, campaign: 'demo-announcement', label: body.p_label, destination: body.p_destination, build: 'Build fixture', available: true });
      data = { id };
    } else throw Error('Unexpected RPC ' + name);
    return route.fulfill({ json: data });
  });

  const page = await context.newPage();
  await page.goto(origin + '/share-engagement-fixture');
  assert.equal(reads, 0);
  await expect(page.getByRole('link', { name: 'View this playtest' })).toHaveAttribute('href', `/tester?campaign=${cp}`);
  await expect(page.getByText('This share link opens the normal Playtested destination without journey attribution.')).toBeVisible();
  assert.equal(engagementRequests, 0, 'Rendering a share entry must not report a visit');

  await page.getByRole('button', { name: 'Expand Sharing & traffic', exact: false }).click();
  await page.getByLabel('Where will you share it?').selectOption('discord');
  await page.getByLabel('Campaign label (optional)').fill('Demo announcement');
  await page.getByLabel(/^Destination/).selectOption('campaign');
  await page.getByRole('button', { name: 'Create share link', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Copy link', exact: true })).toBeVisible();
  assert.equal(created.length, 1);
  assert.equal(created[0].p_campaign, cp);

  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  const shareUrl = new URL(await page.getByLabel('Share URL').inputValue());
  assert.equal(shareUrl.pathname, '/share/' + id);
  assert.equal(shareUrl.searchParams.get('utm_source'), 'discord');

  rows = [{ link_id: id, snapshot: { source: 'discord', label: 'Demo announcement', destination: 'campaign', build: 'Build fixture' }, visits: 0, access_clicks: 0, claims: 0, submissions: 0 }];
  await page.getByRole('button', { name: 'Refresh results' }).click();
  await expect(page.getByRole('table')).toContainText('Build fixture');

  const popup = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Open fixture game' }).click();
  await (await popup).close();
  assert.equal(engagementRequests, 0, 'Opening a game access link must not report an access event');

  await page.goto(origin + `/share-engagement-fixture?pt_visit=${'a'.repeat(64)}`);
  await expect(page.getByRole('link', { name: 'View this playtest' })).toHaveAttribute('href', `/tester?campaign=${cp}`);
  assert.equal(engagementRequests, 0, 'A stale pt_visit parameter must not restart attribution');
  assert.equal((await context.cookies()).length, 0);
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);

  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No page overflow at ' + width);
  }

  console.log('PASS browser: share creation/copy and ordinary destinations still work; no visit/access engagement requests are emitted, stale pt_visit is not propagated, and no analytics browser storage is used.');
} finally {
  await browser.close();
  fs.unlinkSync(dir + '/page.tsx');
  fs.rmdirSync(dir);
}
