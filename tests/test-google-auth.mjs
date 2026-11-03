import fs from "node:fs";
import assert from "node:assert/strict";

const login = fs.readFileSync("app/login/page.tsx", "utf8");
const google = fs.readFileSync("app/login/GoogleSignInButton.tsx", "utf8");
const callback = fs.readFileSync("app/auth/callback/route.ts", "utf8");

assert.match(login, /GoogleSignInButton/);
assert.match(google, /signInWithOAuth/);
assert.match(google, /provider:\s*["']google["']/);
assert.match(google, /\/auth\/callback/);
assert.match(google, /getSafeNextPath\(nextPath\)/);
assert.match(google, /callbackUrl\.searchParams\.set\(["']next["']/);
assert.match(google, /callbackUrl\.searchParams\.set\(["']roles["']/);
assert.doesNotMatch(google, /client[_ -]?secret/i);
assert.doesNotMatch(google, /googleusercontent\.com/i);

assert.match(callback, /exchangeCodeForSession/);
assert.match(callback, /allowedRoles/);
assert.match(callback, /player/);
assert.match(callback, /tester/);
assert.match(callback, /developer/);
assert.match(callback, /update_my_roles/);
assert.match(callback, /getSafeNextPath/);

console.log("Google OAuth handoff checks passed.");
