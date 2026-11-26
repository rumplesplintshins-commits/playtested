import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(
  new URL("../supabase/migrations/20261126190000_tester_tip_emergency_pause.sql", import.meta.url),
  "utf8",
);

const db = new PGlite();
try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA playtested_studios;
    CREATE TABLE public.profiles (id uuid PRIMARY KEY);
    CREATE TABLE playtested_studios.tester_tips (
      id uuid PRIMARY KEY,
      status text NOT NULL,
      stripe_checkout_session_id text,
      stripe_connected_account_id text,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp()
    );
    INSERT INTO public.profiles(id)
    VALUES ('11111111-1111-4111-8111-111111111111');
  `);

  await db.exec(migration);

  const initial = await db.query("SELECT * FROM public.admin_get_tester_tipping_pause_state()");
  assert.equal(initial.rows[0].is_paused, false);
  assert.equal(initial.rows[0].recent_events.length, 0);

  await db.exec(`
    INSERT INTO playtested_studios.tester_tips
      (id, status, stripe_checkout_session_id, stripe_connected_account_id)
    VALUES
      ('22222222-2222-4222-8222-222222222222', 'checkout_created', 'cs_open_1', 'acct_tester_1');
  `);

  const open = await db.query("SELECT * FROM public.admin_list_open_tester_tip_checkouts()");
  assert.equal(open.rows.length, 1);
  assert.equal(open.rows[0].checkout_session_id, "cs_open_1");
  assert.equal(open.rows[0].connected_account_id, "acct_tester_1");

  const paused = await db.query(
    "SELECT * FROM public.admin_set_tester_tipping_paused($1, $2)",
    [true, "11111111-1111-4111-8111-111111111111"],
  );
  assert.equal(paused.rows[0].is_paused, true);
  assert.equal(paused.rows[0].recent_events.length, 1);
  await assert.rejects(
    db.exec(`
      INSERT INTO playtested_studios.tester_tips(id, status)
      VALUES ('33333333-3333-4333-8333-333333333333', 'pending');
    `),
    /temporarily paused/i,
  );

  const duplicatePause = await db.query(
    "SELECT * FROM public.admin_set_tester_tipping_paused($1, $2)",
    [true, "11111111-1111-4111-8111-111111111111"],
  );
  assert.equal(duplicatePause.rows[0].recent_events.length, 1);

  const resumed = await db.query(
    "SELECT * FROM public.admin_set_tester_tipping_paused($1, $2)",
    [false, "11111111-1111-4111-8111-111111111111"],
  );
  assert.equal(resumed.rows[0].is_paused, false);
  assert.equal(resumed.rows[0].recent_events.length, 2);

  await db.exec(`
    INSERT INTO playtested_studios.tester_tips(id, status)
    VALUES ('44444444-4444-4444-8444-444444444444', 'pending');
  `);

  const grants = await db.query(`
    SELECT
      has_function_privilege('anon', 'public.admin_set_tester_tipping_paused(boolean,uuid)', 'EXECUTE') AS anon_can_set,
      has_function_privilege('authenticated', 'public.admin_set_tester_tipping_paused(boolean,uuid)', 'EXECUTE') AS authenticated_can_set,
      has_function_privilege('service_role', 'public.admin_set_tester_tipping_paused(boolean,uuid)', 'EXECUTE') AS service_can_set
  `);
  assert.equal(grants.rows[0].anon_can_set, false);
  assert.equal(grants.rows[0].authenticated_can_set, false);
  assert.equal(grants.rows[0].service_can_set, true);

  const audit = await db.query(
    "SELECT is_paused FROM playtested_studios.tester_tipping_pause_events ORDER BY id",
  );
  assert.deepEqual(audit.rows.map(row => row.is_paused), [true, false]);
  console.log("Tester tipping emergency pause migration tests passed.");
} finally {
  await db.close();
}
