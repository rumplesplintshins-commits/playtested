import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(
  new URL("../supabase/migrations/20261127100000_tester_tip_payment_reconciliation_hardening.sql", import.meta.url),
  "utf8",
);
const db = new PGlite();

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA playtested_studios;
    CREATE TABLE playtested_studios.tester_tips (
      id uuid PRIMARY KEY,
      status text NOT NULL,
      stripe_checkout_session_id text,
      stripe_payment_intent_id text,
      stripe_charge_id text,
      total_amount_pence integer NOT NULL,
      refunded_amount_pence integer NOT NULL DEFAULT 0,
      paid_at timestamptz,
      updated_at timestamptz DEFAULT clock_timestamp()
    );
    INSERT INTO playtested_studios.tester_tips
      (id,status,total_amount_pence)
    VALUES
      ('11111111-1111-4111-8111-111111111111','checkout_created',1150),
      ('22222222-2222-4222-8222-222222222222','checkout_created',1150);
  `);
  await db.exec(migration);

  const tip1 = "11111111-1111-4111-8111-111111111111";
  const tip2 = "22222222-2222-4222-8222-222222222222";

  await db.query(
    "SELECT public.tester_tip_mark_paid($1,$2,$3)",
    [tip1,"cs_session_1","pi_payment_1"],
  );
  await db.query(
    "SELECT public.tester_tip_mark_paid($1,$2,$3)",
    [tip1,"cs_session_1","pi_payment_1"],
  );
  await assert.rejects(
    db.query("SELECT public.tester_tip_mark_paid($1,$2,$3)",[tip1,"cs_other","pi_payment_1"]),
    /identifiers conflict/i,
  );
  await assert.rejects(
    db.query("SELECT public.tester_tip_mark_paid($1,$2,$3)",[tip1,"cs_session_1","pi_other"]),
    /identifiers conflict/i,
  );

  // A refund webhook may arrive before checkout.session.completed. A later paid
  // event must attach/confirm IDs without overwriting the refunded state.
  await db.query(
    "SELECT public.tester_tip_mark_refund($1,$2,$3,$4,$5)",
    [tip2,"pi_payment_2","ch_charge_2",1150,1150],
  );
  await db.query(
    "SELECT public.tester_tip_mark_paid($1,$2,$3)",
    [tip2,"cs_session_2","pi_payment_2"],
  );
  const refunded = await db.query(
    "SELECT status,refunded_amount_pence,stripe_charge_id FROM playtested_studios.tester_tips WHERE id=$1",
    [tip2],
  );
  assert.equal(refunded.rows[0].status,"refunded");
  assert.equal(refunded.rows[0].refunded_amount_pence,1150);
  assert.equal(refunded.rows[0].stripe_charge_id,"ch_charge_2");
  // A delayed earlier partial-refund event must not roll back a later full refund.
  await db.query(
    "SELECT public.tester_tip_mark_refund($1,$2,$3,$4,$5)",
    [tip2,"pi_payment_2","ch_charge_2",500,1150],
  );
  const afterStaleRefund = await db.query(
    "SELECT status,refunded_amount_pence FROM playtested_studios.tester_tips WHERE id=$1",
    [tip2],
  );
  assert.equal(afterStaleRefund.rows[0].status,"refunded");
  assert.equal(afterStaleRefund.rows[0].refunded_amount_pence,1150);

  await assert.rejects(
    db.query(
      "SELECT public.tester_tip_mark_refund($1,$2,$3,$4,$5)",
      [tip2,"pi_payment_2","ch_other",1150,1150],
    ),
    /identifiers\/amount conflict/i,
  );
  await assert.rejects(
    db.query(
      "SELECT public.tester_tip_mark_refund($1,$2,$3,$4,$5)",
      [tip2,"pi_payment_2","ch_charge_2",1200,1150],
    ),
    /Invalid Stripe refund details/i,
  );
  await assert.rejects(
    db.query(
      "SELECT public.tester_tip_mark_disputed($1,$2,$3)",
      [tip2,"pi_payment_2","ch_other"],
    ),
    /identifiers conflict/i,
  );
  await db.query(
    "SELECT public.tester_tip_mark_disputed($1,$2,$3)",
    [tip2,"pi_payment_2","ch_charge_2"],
  );
  const afterDispute = await db.query(
    "SELECT status FROM playtested_studios.tester_tips WHERE id=$1",
    [tip2],
  );
  assert.equal(afterDispute.rows[0].status,"refunded");

  const grants = await db.query(`
    SELECT
      has_function_privilege('anon','public.tester_tip_mark_paid(uuid,text,text)','EXECUTE') AS anon_can_call,
      has_function_privilege('authenticated','public.tester_tip_mark_paid(uuid,text,text)','EXECUTE') AS auth_can_call,
      has_function_privilege('service_role','public.tester_tip_mark_paid(uuid,text,text)','EXECUTE') AS service_can_call
  `);
  assert.equal(grants.rows[0].anon_can_call,false);
  assert.equal(grants.rows[0].auth_can_call,false);
  assert.equal(grants.rows[0].service_can_call,true);

  console.log("Tester tip payment reconciliation hardening tests passed.");
} finally {
  await db.close();
}
