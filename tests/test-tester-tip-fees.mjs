import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const foundation = await readFile(
  new URL("../supabase/migrations/20261125140000_tester_tips_stripe_foundation.sql", import.meta.url),
  "utf8",
);
const cases = await readFile(
  new URL("./test-tester-tip-fees.sql", import.meta.url),
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
    CREATE TABLE public.community_playtests (id uuid PRIMARY KEY);
    CREATE TABLE public.community_game_tests (id uuid PRIMARY KEY);
  `);
  await db.exec(foundation);
  await db.exec(cases);
  console.log("Tester tip fee calculation tests passed.");
} finally {
  await db.close();
}
