import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const sourcePath = fileURLToPath(new URL("../lib/seo.ts", import.meta.url));
function loadTypeScript(path) {
  const moduleSource = readFileSync(path, "utf8");
  const compiled = ts.transpileModule(moduleSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function("module", "exports", compiled)(loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const {
  gameBreadcrumbStructuredData,
  serializeJsonLd,
  videoGameStructuredData,
  websiteStructuredData,
} = loadTypeScript(sourcePath);
const { publicContentSitemapEntries } = loadTypeScript(
  fileURLToPath(new URL("../lib/organic-search.ts", import.meta.url))
);

const website = websiteStructuredData();
assert.equal(website["@context"], "https://schema.org");
assert.equal(website["@graph"].length, 2);
const organization = website["@graph"].find(entity => entity["@type"] === "Organization");
const site = website["@graph"].find(entity => entity["@type"] === "WebSite");
assert.equal(organization["@id"], "https://playtested.co.uk/#organization");
assert.equal(site.publisher["@id"], organization["@id"]);
assert.equal(site.inLanguage, "en-GB");

const game = videoGameStructuredData({
  name: "Example Game",
  path: "/games/steam-123",
  description: "A public catalogue description.",
  genre: "Puzzle",
  image: "https://cdn.example.test/game.png",
});
assert.equal(game["@type"], "VideoGame");
assert.equal(game.url, "https://playtested.co.uk/games/steam-123");
assert.equal(game.mainEntityOfPage, game.url);
assert.equal(game.inLanguage, "en-GB");
assert.equal(game.genre, "Puzzle");
assert.equal(game.image, "https://cdn.example.test/game.png");

const unsafeImage = videoGameStructuredData({
  name: "Unsafe Image Game",
  path: "/submissions/123",
  description: null,
  genre: null,
  image: "javascript:alert(1)",
});
assert.equal(unsafeImage.image, undefined);
assert.equal(unsafeImage.description, undefined);

const breadcrumb = gameBreadcrumbStructuredData("/submissions/123", "Example Game");
assert.equal(breadcrumb["@type"], "BreadcrumbList");
assert.deepEqual(
  breadcrumb.itemListElement.map(item => item.item),
  ["https://playtested.co.uk/", "https://playtested.co.uk/submissions/123"]
);
assert(!serializeJsonLd({ title: "</script>" }).includes("</script>"));

const staticSitemapEntries = publicContentSitemapEntries();
const staticSitemapUrls = staticSitemapEntries.map(entry => entry.url);
assert.equal(new Set(staticSitemapUrls).size, staticSitemapUrls.length);
for (const path of [
  "/community",
  "/playtesting",
  "/find-playtesters",
  "/become-a-playtester",
  "/guides/playtest-feedback",
]) {
  assert(staticSitemapUrls.includes(`https://playtested.co.uk${path}`));
}
assert(staticSitemapUrls.every(url => url.startsWith("https://playtested.co.uk/")));

console.log("PASS SEO regressions: connected Organization/WebSite entities, canonical VideoGame identity, locale, safe images, game breadcrumbs, and crawlable static sitemap coverage.");
