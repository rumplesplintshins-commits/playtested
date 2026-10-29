# Scripts and tests

Run commands from the repository root. Extend an existing relevant helper/test before adding another standalone script.

| Location | Purpose |
| --- | --- |
| `scripts/workers/` | PULSE runner, Steam queue/backfill workers and all versioned technical workers. Operational code, not disposable fixtures. |
| `scripts/maintenance/` | Authorised migration helper and missing-only demo seeding. These can contact/change the configured database. |
| `scripts/recovery/` | Export/readiness, read-only inspection, comparisons, packaging, encryption, off-site verification and rehearsal-evidence tools. |
| `tests/` | Regression/browser tests, recovery safeguards, isolated restore tests, worker validation and benchmarks. |

## Common commands

| Command | Effect / prerequisites |
| --- | --- |
| `npm run test:unit` | Pure/mocked helper and UI regressions; no database connection. |
| `npm run test:workspace` | Mocked developer workspace server checks only. |
| `npm run test:developer-plans` | Free/Pro entitlement, launch-window and grandfathering checks in isolated embedded PostgreSQL. |
| `npm run test:developer-plans:concurrency` | Real account-wide publication/rollback/downgrade races in the existing disposable no-network Docker harness. |
| `npm run test:developer-plans:browser` | Mocked plan assignment, usage and targeting controls; local Next server required. |
| `npm run test:feedback-tabs` | Existing build-isolation checks plus mocked feedback-tab/shortcut/action-persistence/mobile checks; local Next server required. |
| `npm run test:feedback-quality` | Graded rubric, ledger, legacy, permissions and rank checks in embedded PostgreSQL. |
| `npm run test:feedback-quality:concurrency` | Real multi-connection review edits/reversals/rollback in the same disposable no-network Docker harness. |
| `npm run test:feedback-quality:browser` | Mocked admin review flow, live preview, partial awards and edited reasons; local Next server required. |
| `npm run test:reservations` | New four-place/72h rules in an isolated embedded PostgreSQL fixture. |
| `npm run test:reservations:concurrency` | Real multi-connection PostgreSQL 17 checks; creates/removes one disposable Docker container with no network or source credentials. Docker/image must already be available. |
| `npm run test:testing-policy` | Existing testing-policy suite; embedded isolated PostgreSQL fixture, then tester helper checks. |
| `npm run test:share` | Mocked link/API checks and embedded isolated attribution SQL tests. |
| `npm run test:submissions` | Embedded isolated completeness/correction SQL and validation checks. |
| `npm run test:tester-browser` | Existing mocked tester browser suite; local Next server required. |
| `npm run test:share:browser` | Mocked engagement browser suite; local Next server required. |
| `npm run test:submissions:browser` | Mocked correction browser suite; local Next server required. |
| `npm run test:recovery-safeguards` | Syntax/path/ignore checks and no-write export preview. No database connection or restore. |
| `npm run worker:pulse` | Starts the real PULSE polling runner, using `.env.local`. |
| `npm run worker:steam` | Starts the real Steam queue worker, using `.env.local`. |
| `npm run worker:steam-backfill` | Starts the real Steam content backfill worker, using `.env.local`. |
| `npm run worker:technical -- --zip=PATH --game=TITLE --build=LABEL --profile=quick` | Runs the v6.10 technical worker used by PULSE; requires a build and its existing runtime/security dependencies. |
| `npm run maintenance:update -- -GenreUpdate` | Example of selecting an existing migration track, **preview only**. Use the intended existing switch; `-Execute` requires separate authorisation. No share-engagement switch is implied. |
| `npm run maintenance:seed-demos` | Existing missing-only seeder. Even its preview reads the configured database; do not use as an offline check. `--execute` writes and requires authorisation. |
| `npm run recovery:readiness` | Checks local export tools/Docker, not database credentials or recovery validity. |
| `npm run recovery:export -- -OutputDirectory C:\PrivateBackups\Playtested\UNUSED` | No-write export preview. `-Execute` privately prompts for the source URI and requires authorisation. |

Existing `dev`, `build`, `start`, `lint` and `typecheck:testing-policy` commands are unchanged. Individual tests remain runnable as `node tests/<filename>.mjs`; do not run every file indiscriminately.

## Operational boundaries and preserved helpers

- `test-restored-database.mjs`, `test-restored-browser.mjs` and `test-fresh-signup.mjs` operate on the isolated rehearsal stack and are **stateful**, not ordinary mock tests. They were moved, not rerun. Check their existing isolation requirements before deliberate use.
- `technical-test-validation.mjs` and `technical-test-validation-v5.mjs` retain their original worker selection and expectations. Do not substitute a worker based on a filename/version assumption.
- `run-worker-benchmarks.mjs` still requires the **missing** `scripts/workers/technical-test-worker-v6.8.mjs` plus its original benchmark ZIPs. Preserved, not silently repaired or deleted. Its missing-worker diagnostic remains a stop condition.
- All nine original worker entry paths under `scripts/` are retained as tiny forwarding modules. External services, shortcuts and scheduled tasks cannot be confirmed/edited from this repository; old worker commands continue to work. Prefer the npm commands/new paths for future setup. No services were restarted.
- PULSE preflight resolves the new worker location, with legacy-location fallbacks. No worker implementation, job policy, port, environment name or output format was changed.
- PowerShell helpers resolve the repository correctly from nested directories; flat recovery-package harness copies retain their prior root resolution. Packaging now locates moved sources explicitly and retains the same packaged harness basenames.
- Historical JSON manifests, hashes, private archives, database migrations and recovery evidence are unchanged. Paths inside historical JSON evidence describe the original tested snapshot, not today's layout. The corresponding current tests are under `tests/`, and inspection/comparison helpers are under `scripts/recovery/`.
- Working-directory-relative inputs/outputs are unchanged. Keep generated worker output in the existing ignored `technical-test-results/` and `technical-test-validation-results/`, and private rehearsal/temporary artifacts under existing `.backup-tools/` or the established private backup locations. No maintained source/tests were added to ignore rules.

No files were judged safely disposable during this organisation. Versioned workers, validation variants, benchmark helpers and one-time operational/recovery tools are preserved; their continued use cannot be inferred from their age or a passed test.
