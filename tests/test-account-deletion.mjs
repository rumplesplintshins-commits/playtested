import fs from "node:fs";
import assert from "node:assert/strict";

const migration = fs.readFileSync(
  "supabase/migrations/202610300001_account_deletion_requests.sql",
  "utf8"
);
const page = fs.readFileSync("app/account/delete/page.tsx", "utf8");

assert.match(migration, /account_deletion_requests/);
assert.match(migration, /auth\.uid\(\)/);
assert.match(migration, /security definer/i);
assert.match(migration, /revoke all on function public\.request_account_deletion\(\) from public, anon/i);
assert.match(migration, /grant execute on function public\.request_account_deletion\(\) to authenticated/i);
assert.match(migration, /one_open_per_user/);

assert.match(page, /Type.*DELETE/s);
assert.match(page, /request_account_deletion/);
assert.match(page, /does not immediately sign you out or erase the account/i);
assert.doesNotMatch(page, /service.role/i);

console.log("Account deletion request regression checks passed.");
