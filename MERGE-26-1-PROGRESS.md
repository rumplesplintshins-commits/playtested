# Merge 26.1 — Performance & UX Optimisation

Latest6November recovery result: fresh operator export at00:42–00:43UTC independently passes hashes/full decode, current schema/security/migration coverage, Auth/application counts and consistency with126 rehashed Storage files. The missing-current-database blocker is cleared. Full isolated restore remains Not Run: installed Windows PostgreSQL lacks required Supabase Vault/cron extensions. No production writes/migrations/merge/deployment; explicit release approval still required. See `docs/MERGE-26-1-COMPLETED-BACKUP-VERIFICATION.md`; earlier blocked notes below are historical.

Baseline-probe follow-up: current read-only management query confirms17.11 and both required schema objects. Failed operator run saved no baseline JSON, so its historical failed field is unknown. Probe now explicitly enforces a read-only transaction, saves per-condition diagnostics and retains all schema/version checks. PowerShell5.1 and isolated PostgreSQL tests pass; production export/restore remains unverified and release NO-GO.

Windows operator follow-up: export URI parsing and null-safe cleanup corrected and regression-tested using dummy credentials on Windows PowerShell5.1. No production connection/export occurred; database recovery remains unverified and release NO-GO. Test: `tests/test-m261-export-powershell.ps1`.

6 November: recovery-only check confirms no listed managed backup/PITR window or usable local PG connection. A native read-only hidden-prompt export helper is prepared and preview-validated; actual export requires operator credential entry. See `docs/MERGE-26-1-DATABASE-RECOVERY-OPERATOR.md`. No production change, migration, merge or deployment.

Latest follow-up: [release-readiness assessment](docs/MERGE-26-1-RELEASE-READINESS.md). Atomic128 reconciliation, corrected preflight signature, independent recovery verification and focused GitHub Actions coverage are added. Fresh Storage backup now covers126/126 objects; a current database recovery point remains BLOCKED. No production changes.

Source: production branch `v11` at `1c85227`; isolated branch `codex/merge-26-1-performance`. Merge 26 and the separate Merge 27 SEO worktree have not been modified. Production inspection was read-only. No production migrations, merge, configuration changes or deployment have occurred.

## Implemented

- Public catalogue: explicitly anonymous client, 30-second/16-page tab-memory LRU cache, in-flight deduplication, shared reception reads, parallel enrichment, next-page prefetch (disabled for data saving/slow connections), retained navigation state, stale-response protection, retry UI. No persistent identifiers or authenticated-data cache.
- Catalogue database: reconcile the existing production PL/pgSQL fixture-guard hotfix without changing known current bodies; custom parameter-sensitive SQL planning and two targeted indexes. Preserve the invoker/RLS boundary, exact totals, Featured priority, all filters, fixture exclusions and Steam deduplication. Unknown function bodies stop migration rather than being overwritten.
- Submission editing: load correction and PC requirements concurrently. New/changed game titles limited to 60 Unicode code points with live counters and database enforcement. Unchanged historical titles, including claims preserving an imported title, remain supported; no truncation or backfill.
- Screenshot management: progress, confirmed local previews, at most two transfers (one for large decoded images), parallel server storage variants, partial-failure reconciliation, durable cleanup, no full submission reload, preserved scroll/focus. Existing five-image, format/content/size/pixel, owner, origin and approval safeguards remain in place.
- Admin/mobile: long legacy titles and developer names wrap, selected review heading reflows, notification content wraps with an independent scrolling panel and accessible region. Publication/Test/Demo controls explain hiding versus permanent deletion.
- Admin analytics: service-only all-time submitted-record count, approved/legacy imported ownership count and a union deduplicated by normalized Steam identity. Genuine archived history is retained; Test/Demo and known fixtures are excluded. No tester identities or optional tracking data are used.
- Playtest review guidance: initially collapsed native disclosure, keyboard accessible; separate feedback-submitted and moderation times in Europe/London, with missing historical timestamps identified honestly. UTC storage and XP/moderation decisions are unchanged.

## Evidence and limits

Evidence files and reproduction commands are in [the validation report](docs/MERGE-26-1-VALIDATION.md). The live anonymous baseline contains a real `57014` timeout on page 1 and approximately 3.1-second successful RPCs on pages 2/7. Production EXPLAIN is unavailable to the read-only role and PostgREST plan output is disabled; no grants or configuration were changed to obtain it.

Development PostgreSQL benchmarking used 195,362 temporary imports, 9,550 eligible, two warm-ups and five measurements per variant. Every fixture/function/index change was rolled back; installed function hash and zero persistent imports were verified. The latest median changed from 452.961 ms to 410.687 ms (about 9.3%); a preceding run showed about 6.6%. This is a modest database improvement, not proof of the live two-second target. Isolated PGlite median was 166.466 → 169.829 ms, showing no gain in that environment.

Local component tests measure network-independent browser behavior with explicit mocked latency. Submission read starts changed from about 184 ms apart to simultaneous. Cached backwards navigation is below 100 ms in the recorded run. Screenshot total UI timings do not demonstrate a throughput improvement: the candidate fixture includes additional catalogue/review UI; use real upload measurements during acceptance rather than claiming a misleading speedup.

## Development migrations

Applied and verified on `ktifgybnkdaotdxrvjgq` only: `202611060128` through `202611060131`. Verified two indexes, enabled title triggers, catalogue PL/pgSQL implementation and denied ordinary/anonymous access to admin aggregation. Existing imported row count remains zero. All production data/configuration is untouched.

## Release status

Ready for code review after the recorded checks; production release remains owner-controlled. Follow [the deployment checklist](docs/MERGE-26-1-DEPLOYMENT-CHECKLIST.md). Real browser-toolbar zoom/screen-reader acceptance, real upload throughput and live after-deployment timings remain explicit checks. Do not treat CSS zoom or mocked browser sessions as real-account production acceptance.
