import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const model={};new Function("exports","require",ts.transpileModule(fs.readFileSync("lib/platforms.tsx","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText)(model,require);
const {PLATFORMS,Platform,platformBadge,platformOf,legacyPlatform,platformLinkError,PLATFORM_INFO}=model;

function expectPlatform(name,value){assert.equal(value,name,`expected platform ${name}`);}

// 1. All six platform choices exist in order.
assert.deepEqual(PLATFORMS,["steam","pc","browser","roblox","android","ios"],"six platforms");

// 2. Badge contract: Browser->Web, Roblox->Roblox, Android/iOS->Mobile, Steam/PC->none.
assert.equal(platformBadge("browser"),"Web");
assert.equal(platformBadge("roblox"),"Roblox");
assert.equal(platformBadge("android"),"Mobile");
assert.equal(platformBadge("ios"),"Mobile");
assert.equal(platformBadge("steam"),null);
assert.equal(platformBadge("pc"),null);
assert.equal(platformBadge(null),null);
assert.equal(platformBadge(undefined),null);

// 3. platformOf narrows; legacyPlatform defaults legacy/unknown to steam.
for(const p of PLATFORMS)assert.equal(platformOf(p),p);
assert.equal(platformOf("not-a-platform"),null);
assert.equal(platformOf(undefined),null);
assert.equal(platformOf(null),null);
assert.equal(legacyPlatform(null),"steam");
assert.equal(legacyPlatform(undefined),"steam");
assert.equal(legacyPlatform("browser"),"browser");

// 4. Every platform has label, icon, linkLabel, placeholder, guidance.
for(const p of PLATFORMS){
  const info=PLATFORM_INFO[p];
  assert.ok(typeof info.label==="string"&&info.label.length>0,`${p} label`);
  assert.ok(info.icon,`${p} icon`);
  assert.ok(typeof info.linkLabel==="string"&&info.linkLabel.length>0,`${p} linkLabel`);
  assert.ok(typeof info.linkPlaceholder==="string",`${p} placeholder`);
  assert.ok(typeof info.linkGuidance==="string"&&info.linkGuidance.length>0,`${p} guidance`);
}

// 5. Dynamic link validation per platform.
// Steam requires a Steam store URL.
assert.equal(platformLinkError("steam",""),null,"steam blank ok");
assert.equal(platformLinkError("steam","https://store.steampowered.com/app/123456/"),null,"steam valid");
assert.equal(platformLinkError("steam","https://store.steampowered.com/app/123456"),null,"steam valid no slash");
assert.equal(platformLinkError("steam","https://example.com/"),"Use a Steam store URL (store.steampowered.com).");
assert.equal(platformLinkError("steam","http://store.steampowered.com/app/1/"),"Use an HTTPS link.");
// PC / Other accepts any http(s).
assert.equal(platformLinkError("pc","https://itch.io/game/"),null);
assert.equal(platformLinkError("pc","http://example.com/download"),null);
assert.equal(platformLinkError("pc","not a url"),"Enter a valid URL.");
// Browser requires HTTPS.
assert.equal(platformLinkError("browser","https://play.example.com/"),null);
assert.equal(platformLinkError("browser","http://play.example.com/"),"Use an HTTPS link.");
// Roblox requires roblox.com over HTTPS.
assert.equal(platformLinkError("roblox","https://www.roblox.com/games/123/Example"),null);
assert.equal(platformLinkError("roblox","https://roblox.com/games/123"),null);
assert.equal(platformLinkError("roblox","http://www.roblox.com/games/123"),"Use an HTTPS link.");
assert.equal(platformLinkError("roblox","https://example.com/"),"Use a Roblox experience URL.");
// Android requires Google Play / Android over HTTPS.
assert.equal(platformLinkError("android","https://play.google.com/store/apps/details?id=com.example"),null);
assert.equal(platformLinkError("android","http://play.google.com/"),"Use an HTTPS link.");
assert.equal(platformLinkError("android","https://example.com/android-game.apk"),"Use a Google Play or supported Android game URL.");
// iOS requires apple.com over HTTPS.
assert.equal(platformLinkError("ios","https://apps.apple.com/us/app/example/id123456789"),null);
assert.equal(platformLinkError("ios","http://apps.apple.com/"),"Use an HTTPS link.");
assert.equal(platformLinkError("ios","https://example.com/ios"),"Use an App Store or supported iOS URL.");
assert.equal(platformLinkError("ios","https://play.google.com/"),"Use an App Store or supported iOS URL.");

console.log("PASS platforms: six choices, badge contract, legacy default, per-platform link validation.");
