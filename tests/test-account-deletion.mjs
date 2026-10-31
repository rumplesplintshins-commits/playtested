import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const page = read("app/account/delete/page.tsx");
const route = read("app/api/account/delete/route.ts");
const admin = read("lib/supabase-admin.ts");

// ------------------------------------------------------------
// Client deletion page
// ------------------------------------------------------------

assert.match(
  page,
  /confirmation !== "DELETE"/,
  "Deletion page must require the exact DELETE confirmation."
);

assert.match(
  page,
  /window\.confirm/,
  "Deletion page must require a final browser confirmation."
);

assert.match(
  page,
  /fetch\("\/api\/account\/delete"/,
  "Deletion page must use the authenticated server deletion endpoint."
);

assert.match(
  page,
  /method:\s*"POST"/,
  "Deletion request must use POST."
);

assert.match(
  page,
  /confirmation:\s*"DELETE"/,
  "Deletion endpoint request must include the DELETE confirmation."
);

assert.match(
  page,
  /Permanently delete account/,
  "UI must clearly describe the action as permanent."
);

assert.match(
  page,
  /cannot be undone/i,
  "UI must warn that deletion cannot be undone."
);

assert.match(
  page,
  /window\.location\.replace\("\/\?accountDeleted=1"\)/,
  "Successful deletion must redirect away from the account area."
);

assert.doesNotMatch(
  page,
  /SUPABASE_SERVICE_ROLE_KEY/,
  "Service-role configuration must never appear in client code."
);

// ------------------------------------------------------------
// Server deletion endpoint
// ------------------------------------------------------------

assert.match(
  route,
  /supabase\.auth\.getUser\(\)/,
  "Server endpoint must authenticate the current user."
);

assert.match(
  route,
  /confirmation.*DELETE/s,
  "Server endpoint must independently verify DELETE confirmation."
);

assert.match(
  route,
  /prepare_my_account_erasure/,
  "Database erasure preparation must run before Auth deletion."
);

assert.match(
  route,
  /admin\.auth\.admin\.deleteUser\(user\.id\)/,
  "Supabase Auth user must be deleted through the server-side admin client."
);

const prepareIndex = route.indexOf("prepare_my_account_erasure");
const deleteIndex = route.indexOf("admin.auth.admin.deleteUser");

assert.ok(
  prepareIndex !== -1 &&
    deleteIndex !== -1 &&
    prepareIndex < deleteIndex,
  "Personal-data preparation must occur before Auth user deletion."
);

assert.match(
  route,
  /account_deletion_requests/,
  "Endpoint must finalise the deletion audit record."
);

assert.match(
  route,
  /status:\s*"completed"/,
  "Successful deletion must mark the request completed."
);

assert.match(
  route,
  /user_id:\s*null/,
  "Completed deletion request must remove the original user UUID."
);

assert.match(
  route,
  /deleted:\s*true/,
  "Endpoint must only return deletion success after Auth deletion."
);

// ------------------------------------------------------------
// Server-only Supabase admin client
// ------------------------------------------------------------

assert.match(
  admin,
  /import "server-only"/,
  "Supabase admin client must be server-only."
);

assert.match(
  admin,
  /process\.env\.SUPABASE_SERVICE_ROLE_KEY/,
  "Admin client must read the server-only service-role environment variable."
);

assert.doesNotMatch(
  admin,
  /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/,
  "Service-role key must never use a NEXT_PUBLIC environment variable."
);

assert.match(
  admin,
  /persistSession:\s*false/,
  "Admin client must not persist an admin session."
);

console.log("Account deletion regression checks passed.");