# Merge 26 complete test catalogue

Evidence snapshot: 2026-11-04T21:37:16.685Z. Environment: localhost and development `ktifgybnkdaotdxrvjgq`, plus disposable network-isolated PostgreSQL/PGlite fixtures. Production was not accessed.

## Execution summary

| Measure | Actual count |
|---|---:|
| Total catalogue cases | 95 |
| Automated cases passed | 67 |
| Automated cases failed | 0 |
| Manual owner acceptance cases pending | 28 |
| Blocked/unexecuted automated cases | 0 |
| Executed suites/checks passed | 20 |
| Executed suites/checks failed | 0 |
| Observed critical technical failures | 0 |
| Observed high technical failures | 0 |

Case counts are documented acceptance criteria mapped to executed assertions, not counts of raw assertion statements. Suite counts are separate. Manual owner acceptance is **Not Run** even when browser automation covers the same behaviour. Privacy/retention/notice and production operational approval remain release gates, not silently passed tests. Existing lint debt is recorded by the comparison suite; this is not a clean-repository lint claim.

## Safe fixtures and how to run

- Start/verify `http://localhost:3000`; `.env.local` must target development only. Never paste credentials into the plan or logs. Existing QA credentials remain in ignored local fixture files; use your established development logins or separate development-only accounts via Login/registration.
- QA game A: **[DEV QA] Neon Courier**, submission `15039e49-cad5-4a66-8382-74544502fece`, campaign `a6a2ee7c-8c30-4080-b0a6-b05ed0e70e3c`. QA game B: **[DEV QA] Mosslight Grove**, submission `cfcb4384-cc35-43d7-b98f-ee9c992f7ee5`, campaign `8015b2de-c15b-4f6e-947d-7bca3d03cd61`. Use the owning developer, separate tester, ordinary unrelated developer and development administrator; never a production login.
- Disposable SQL fixtures: `tests/fixtures/merge26-schema.sql`, `merge26-tester-rank.sql`, `merge26-reservation-policy.sql`, and `tests/merge26-availability-fixture.mjs`. These seed controlled states automatically. Clock/XP changes are confined to disposable databases. Do not edit genuine development reservations to simulate time.
- Full focused validation: `node tests/run-merge26-release-validation.mjs`. To rerun only a changed scope: `--only=identity` (or comma-separated suite names). Browser integration requires the existing ignored M24 QA account fixtures and development server. Concurrency uses the cached local PostgreSQL Docker image without network access or persistent databases.
- If no real QA game is full, run `node --env-file=.env.local tests/test-merge26-release-browser.mjs`: it temporarily fills **only free** QA slots with newly created trusted-synthetic accounts, checks opt-in/release/bell navigation, then releases its reservations and deletes its accounts. Do not terminate it mid-cleanup. Public-number tombstones intentionally remain.
- Evidence summaries are committed in [AUTOMATED RESULTS](docs/MERGE-26-AUTOMATED-RESULTS.json); local sanitised outputs/screenshots are under `technical-test-results/m26-final/` and are not committed.

## Automated catalogue

### M26-ID-001 — Tester identity

- **Test ID:** M26-ID-001
- **Feature area:** Tester identity
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-tester-identity.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-tester-identity.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Existing tester backfill and subsequent allocation create unique public numbers.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/identity.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-ID-002 — Tester identity

- **Test ID:** M26-ID-002
- **Feature area:** Tester identity
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-tester-identity.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-tester-identity.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** One tester has the same public number on two different games.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/identity.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-ID-003 — Tester identity

- **Test ID:** M26-ID-003
- **Feature area:** Tester identity
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-tester-identity.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-tester-identity.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Promotion and demotion change current rank without changing public number.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/identity.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-ID-004 — Tester identity

- **Test ID:** M26-ID-004
- **Feature area:** Tester identity
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-concurrency.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-concurrency.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Concurrent registrations/repeated profile updates allocate exactly one unique number per account.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/concurrency.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-ID-005 — Tester identity

- **Test ID:** M26-ID-005
- **Feature area:** Tester identity
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-tester-identity.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-tester-identity.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Missing/deleted profile returns unavailable; deleted-account mapping is nulled and number remains a non-reassigned tombstone.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/identity.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-ID-006 — Tester identity

- **Test ID:** M26-ID-006
- **Feature area:** Tester identity
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-tester-identity.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-tester-identity.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Public output contains report ID, public number and current rank only; private mapping SELECT is denied.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/identity.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-ID-007 — Tester identity

- **Test ID:** M26-ID-007
- **Feature area:** Tester identity
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-tester-identity.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-tester-identity.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Pending/rejected identities are withheld publicly; authorised admin can resolve private moderation ranks.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/identity.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-ID-008 — Tester identity

- **Test ID:** M26-ID-008
- **Feature area:** Tester identity
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-tester-identity.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-tester-identity.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Direct private-profile UUID rank probing is denied; authorised feedback resolution still works.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/identity.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-ID-009 — Tester identity

- **Test ID:** M26-ID-009
- **Feature area:** Tester identity
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-label-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-label-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Actual labels display Bronze/Silver Tester #114 and keep 114 after rank changes. Responses are mocked, not live tester data.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/labels-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-ID-010 — Tester identity

- **Test ID:** M26-ID-010
- **Feature area:** Tester identity
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-label-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-label-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Sibling labels issue one bulk RPC; a fresh view resolves current rank rather than persisting a stale mapping.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/labels-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AD-001 — Admin review

- **Test ID:** M26-AD-001
- **Feature area:** Admin review
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-tester-identity.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-tester-identity.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Admin identity resolution uses the correct report/tester association, including private reports.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/identity.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AD-002 — Admin review

- **Test ID:** M26-AD-002
- **Feature area:** Admin review
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-submission-corrections.mjs --listings`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-submission-corrections.mjs --listings`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Material disclosure changes require fresh reassessment; approval/rejection reasons and stale-review protection remain.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/listings.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AD-003 — Admin review

- **Test ID:** M26-AD-003
- **Feature area:** Admin review
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Status priority and actual review activity determine order; ties are deterministic.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/core.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AD-004 — Admin review

- **Test ID:** M26-AD-004
- **Feature area:** Admin review
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Completed private Test/Demo reassessment leaves the pending queue and preserves its reason.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/core.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AD-005 — Admin review

- **Test ID:** M26-AD-005
- **Feature area:** Admin review
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-notification-routing.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-notification-routing.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Decisions notify only the correct owner and preserve recipient read/dismiss protections.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/notifications.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AD-006 — Admin review

- **Test ID:** M26-AD-006
- **Feature area:** Admin review
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-testing-policy.mjs --graded-quality`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-testing-policy.mjs --graded-quality`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Existing graded-quality moderation, XP awards/reversal and audit invariants remain intact.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/xp-quality.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AN-001 — Tester analytics

- **Test ID:** M26-AN-001
- **Feature area:** Tester analytics
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-tester-analytics.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-tester-analytics.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Current registered tester population excludes explicitly synthetic accounts and includes zero-report profiles.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/tester-analytics.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AN-002 — Tester analytics

- **Test ID:** M26-AN-002
- **Feature area:** Tester analytics
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-tester-analytics.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-tester-analytics.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Active testers are distinct completed-report submitters within the last 30 days, not reservations.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/tester-analytics.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AN-003 — Tester analytics

- **Test ID:** M26-AN-003
- **Feature area:** Tester analytics
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-tester-analytics.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-tester-analytics.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Multiple reports per tester count once each; pending, accepted and rejected totals reconcile.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/tester-analytics.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AN-004 — Tester analytics

- **Test ID:** M26-AN-004
- **Feature area:** Tester analytics
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-tester-analytics.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-tester-analytics.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Acceptance is accepted/(accepted+rejected); pending is excluded. Fixture expected 87.5%.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/tester-analytics.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AN-005 — Tester analytics

- **Test ID:** M26-AN-005
- **Feature area:** Tester analytics
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-tester-analytics.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-tester-analytics.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Recorded hours sum valid durations once; missing, negative and non-finite durations do not inflate totals.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/tester-analytics.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AN-006 — Tester analytics

- **Test ID:** M26-AN-006
- **Feature area:** Tester analytics
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-tester-analytics.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-tester-analytics.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** All four configured ranks, including empty tiers, plus unavailable-profile reports reconcile with totals.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/tester-analytics.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AN-007 — Tester analytics

- **Test ID:** M26-AN-007
- **Feature area:** Tester analytics
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-tester-analytics.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-tester-analytics.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Report metrics group by current canonical rank; deleted profiles retain aggregate history without a fabricated rank.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/tester-analytics.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AN-008 — Tester analytics

- **Test ID:** M26-AN-008
- **Feature area:** Tester analytics
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-tester-analytics.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-tester-analytics.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Explicit Test/Demo reports and trusted synthetic accounts are excluded; archived genuine history is retained.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/tester-analytics.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AN-009 — Tester analytics

- **Test ID:** M26-AN-009
- **Feature area:** Tester analytics
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-tester-analytics.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-tester-analytics.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Empty population/report data returns zero counts and null decision rates, not fabricated percentages.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/tester-analytics.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AN-010 — Tester analytics

- **Test ID:** M26-AN-010
- **Feature area:** Tester analytics
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-release-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-release-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Admin API returns actual development aggregate; anonymous receives 401 and ordinary developer 403.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/release-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AV-001 — Availability

- **Test ID:** M26-AV-001
- **Feature area:** Availability
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-availability.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-availability.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Full-game opt-in is unique and current reservation holders/ordinary non-testers cannot request.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/availability.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AV-002 — Availability

- **Test ID:** M26-AV-002
- **Feature area:** Availability
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-availability.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-availability.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Opt-out prevents later availability deliveries.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/availability.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AV-003 — Availability

- **Test ID:** M26-AV-003
- **Feature area:** Availability
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-availability.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-availability.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Manual release creates one private-free bell alert per eligible opted-in recipient.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/availability.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AV-004 — Availability

- **Test ID:** M26-AV-004
- **Feature area:** Availability
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-availability.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-availability.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Controlled expired timestamp releases capacity and server processing sends one alert without a browser or 72-hour wait.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/availability.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AV-005 — Availability

- **Test ID:** M26-AV-005
- **Feature area:** Availability
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-availability.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-availability.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Future/fresh deadlines are not expired, and repeated processing is idempotent.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/availability.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AV-006 — Availability

- **Test ID:** M26-AV-006
- **Feature area:** Availability
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-availability.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-availability.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** An actual capacity increase triggers a new available transition.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/availability.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AV-007 — Availability

- **Test ID:** M26-AV-007
- **Feature area:** Availability
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-availability.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-availability.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Successful claim removes the same-campaign request; completed/rejected reports continue occupying capacity.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/availability.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AV-008 — Availability

- **Test ID:** M26-AV-008
- **Feature area:** Availability
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-concurrency.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-concurrency.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Concurrent last-place claims allow one winner; another campaign cannot bypass one-active-test protection.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/concurrency.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AV-009 — Availability

- **Test ID:** M26-AV-009
- **Feature area:** Availability
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-concurrency.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-concurrency.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Simultaneous release/scheduler and expiry workers do not duplicate recipient events.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/concurrency.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AV-010 — Availability

- **Test ID:** M26-AV-010
- **Feature area:** Availability
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-availability.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-availability.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** A waiter who now holds another reservation or lost eligibility receives no alert until eligible.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/availability.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AV-011 — Availability

- **Test ID:** M26-AV-011
- **Feature area:** Availability
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-availability.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-availability.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Archived games generate no misleading alerts; resumed eligibility is checked against live capacity.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/availability.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AV-012 — Availability

- **Test ID:** M26-AV-012
- **Feature area:** Availability
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-availability.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-availability.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Other accounts cannot read waiting rows or insert preferences directly; anonymous/ordinary callers cannot run the worker.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/availability.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AV-013 — Availability

- **Test ID:** M26-AV-013
- **Feature area:** Availability
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-availability.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-availability.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Expired requests and this new alert class are cleaned at their defined periods; dismissing an alert does not replay an unchanged event.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/availability.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-AV-014 — Availability

- **Test ID:** M26-AV-014
- **Feature area:** Availability
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-release-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-release-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Real development full-game opt-in/out, synthetic-only reservation release and one bell navigating to the correct campaign work.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/release-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-EX-001 — Earlier Merge 26

- **Test ID:** M26-EX-001
- **Feature area:** Earlier Merge 26
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Featured ranks accepted >=6 developer games, unrated developers, below-6 developers, then generic imports; 5.9/6 boundary is explicit.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/core.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-EX-002 — Earlier Merge 26

- **Test ID:** M26-EX-002
- **Feature area:** Earlier Merge 26
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Ranking applies before pagination and filtered search; claimed imports are recognised for anonymous visitors and duplicates removed.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/core.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-EX-003 — Earlier Merge 26

- **Test ID:** M26-EX-003
- **Feature area:** Earlier Merge 26
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Steam source filter, Recently added and Title A-Z retain their primary sorting/filtering behaviour.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/core.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-EX-004 — Earlier Merge 26

- **Test ID:** M26-EX-004
- **Feature area:** Earlier Merge 26
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Owner archive/restore preserves private historical feedback and genuine acquisition totals.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/earlier-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-EX-005 — Earlier Merge 26

- **Test ID:** M26-EX-005
- **Feature area:** Earlier Merge 26
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Eligible fresh unapproved deletion succeeds; approved or dependency-bearing records refuse hard deletion.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/core.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-EX-006 — Earlier Merge 26

- **Test ID:** M26-EX-006
- **Feature area:** Earlier Merge 26
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Unrelated owner and ordinary user cannot mutate another listing or change Admin Test/Demo.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/core.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-EX-007 — Earlier Merge 26

- **Test ID:** M26-EX-007
- **Feature area:** Earlier Merge 26
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Explicit Test/Demo is absent from public views, ordinary tester offers and acquisition counts while private access remains.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/earlier-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-EX-008 — Earlier Merge 26

- **Test ID:** M26-EX-008
- **Feature area:** Earlier Merge 26
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Test feedback is absent from public community ratings; archived Steam-linked games do not expose a duplicate import.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/core.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-EX-009 — Earlier Merge 26

- **Test ID:** M26-EX-009
- **Feature area:** Earlier Merge 26
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Confirmed save shows one existing fixed toast and scrolls up; failed save retains position; reduced motion is respected.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/earlier-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-EX-010 — Earlier Merge 26

- **Test ID:** M26-EX-010
- **Feature area:** Earlier Merge 26
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-notification-routing.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-notification-routing.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Accepted feedback is owner-only, moderation-gated and durably deduplicated with exact campaign/build links.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/notifications.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-EX-011 — Earlier Merge 26

- **Test ID:** M26-EX-011
- **Feature area:** Earlier Merge 26
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-build-results-selection.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-build-results-selection.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Late build responses never overwrite another selected build; failed loads do not present empty success.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/build-selection.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-EX-012 — Earlier Merge 26

- **Test ID:** M26-EX-012
- **Feature area:** Earlier Merge 26
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** A collapsed relationship ID in a notification still selects its correct game/build.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/earlier-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-EX-013 — Earlier Merge 26

- **Test ID:** M26-EX-013
- **Feature area:** Earlier Merge 26
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-developer-workspace.mjs --server-only`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-developer-workspace.mjs --server-only`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Owner-scoped workspace queries, canonical deduplication and historical build association remain intact.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/workspace.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-UI-001 — UI and accessibility

- **Test ID:** M26-UI-001
- **Feature area:** UI and accessibility
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-label-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-label-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Keyboard-native disclosure opens/closes, retains an unsaved field and has reduced-motion-safe presentation.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/labels-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-UI-002 — UI and accessibility

- **Test ID:** M26-UI-002
- **Feature area:** UI and accessibility
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-label-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-label-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Public label/disclosure fixture fits mobile and simulated 150% zoom; missing profiles show a clear fallback.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/labels-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-UI-003 — UI and accessibility

- **Test ID:** M26-UI-003
- **Feature area:** UI and accessibility
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-release-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-release-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Real admin Tester Analytics collapse/keyboard state and mobile/150% layouts work without runtime errors.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/release-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-UI-004 — UI and accessibility

- **Test ID:** M26-UI-004
- **Feature area:** UI and accessibility
- **Priority:** High
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Existing admin analytics/workspace and changed management cards retain mobile/150% usability.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/earlier-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-PR-001 — Privacy and security

- **Test ID:** M26-PR-001
- **Feature area:** Privacy and security
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** No analytic event before consent; opting in records an actual event and report source, withdrawal stops further events; synthetic event cleaned.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/earlier-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-PR-002 — Privacy and security

- **Test ID:** M26-PR-002
- **Feature area:** Privacy and security
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-security.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-security.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Anonymous/ordinary consenting events are allowed; verified admin, bot/monitor, DNT and GPC traffic are omitted.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/security.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-PR-003 — Privacy and security

- **Test ID:** M26-PR-003
- **Feature area:** Privacy and security
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-proxy-origin.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-proxy-origin.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Canonical same-site proxy requests succeed; missing/spoofed/cross-site origins remain rejected and screenshot auth/RLS guards remain.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/origins.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-PR-004 — Privacy and security

- **Test ID:** M26-PR-004
- **Feature area:** Privacy and security
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Private control tables deny browser access; anonymous/foreign ownership is enforced and audit actors can be anonymised without destroying history.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/core.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-PR-005 — Privacy and security

- **Test ID:** M26-PR-005
- **Feature area:** Privacy and security
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-tester-analytics.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-tester-analytics.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Analytics RPC is service-only and returns server-side aggregates, not private tester-level exports.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/tester-analytics.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-PR-006 — Privacy and security

- **Test ID:** M26-PR-006
- **Feature area:** Privacy and security
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Acquisition counts submission records/current approval/distinct owners separately; unknown and evidence-labelled sources are not invented.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/core.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-RE-001 — Release readiness

- **Test ID:** M26-RE-001
- **Feature area:** Release readiness
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node node_modules/typescript/bin/tsc --noEmit`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node node_modules/typescript/bin/tsc --noEmit`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** TypeScript finishes successfully on the final implementation.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/typescript.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-RE-002 — Release readiness

- **Test ID:** M26-RE-002
- **Feature area:** Release readiness
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node node_modules/next/dist/bin/next build`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node node_modules/next/dist/bin/next build`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Optimised production build finishes successfully, without deploying.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/build.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-RE-003 — Release readiness

- **Test ID:** M26-RE-003
- **Feature area:** Release readiness
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-lint-baseline.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-lint-baseline.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Changed TypeScript files introduce no new lint error-rule counts versus b7d8617; baseline debt is reported.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/targeted-lint.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-RE-004 — Release readiness

- **Test ID:** M26-RE-004
- **Feature area:** Release readiness
- **Priority:** Critical
- **Test type:** Automated
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-development-postflight.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-development-postflight.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Local configuration targets development; the minute scheduler is active and its latest actual run succeeded; private grants are denied.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/development-postflight.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

## Manual owner acceptance catalogue

Every case below remains Not Run by the owner in this release record. Browser automation is recorded separately above.

### M26-MN-001 — Environment

- **Test ID:** M26-MN-001
- **Feature area:** Environment
- **Priority:** Critical
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **All roles**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/`.
  2. Open localhost in a fresh browser.
  3. Open browser Network tools and reload; inspect Supabase request hostname.
  4. Sign in with the development administrator, then sign out.
- **Expected result:** Only localhost and ktifgybnkdaotdxrvjgq Supabase are used; no production project requests.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** No cleanup beyond signing out.

### M26-MN-002 — Public identities

- **Test ID:** M26-MN-002
- **Feature area:** Public identities
- **Priority:** High
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Tester, then admin, then signed-out visitor**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/tester`.
  2. Use the dedicated QA tester to claim a QA campaign and submit a specific report.
  3. As admin, accept the report using the existing quality rubric and a reason.
  4. Sign out and open the approved game’s accepted feedback.
- **Expected result:** Accepted public feedback shows a rank-aware stable number; no account email/private UUID. Pending/rejected reports remain private.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Use only disposable QA feedback; retain its audit history rather than deleting genuine reports.

### M26-MN-003 — Public identities

- **Test ID:** M26-MN-003
- **Feature area:** Public identities
- **Priority:** High
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Same QA tester and visitor**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/tester`.
  2. Submit/accept a second report for the other QA campaign using the same tester.
  3. Open both approved game pages signed out.
  4. Compare the tester labels.
- **Expected result:** The tester number is identical across games; current rank is displayed and not described as historical rank.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Retain intended QA history; do not change real users’ XP.

### M26-MN-004 — Admin review

- **Test ID:** M26-MN-004
- **Feature area:** Admin review
- **Priority:** High
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Administrator**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/admin/submissions?tab=playtests`.
  2. Open feedback review and choose a dedicated QA report.
  3. Read its existing internal tester identifier and adjacent rank.
  4. Review a different tester’s card and compare with that tester’s own current rank panel.
- **Expected result:** Correct identifier association and explicitly current rank; no XP awards changed by viewing.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Leave review decisions unchanged for this display-only check.

### M26-MN-005 — Tester analytics

- **Test ID:** M26-MN-005
- **Feature area:** Tester analytics
- **Priority:** High
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Administrator**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/admin/submissions`.
  2. Expand Tester Analytics.
  3. Review completed/pending/accepted/rejected cards and the acceptance denominator.
  4. Compare recorded hours/current rank rows and empty tiers with dedicated QA records.
- **Expected result:** Readable real data; current rank grouping, unknown profiles and missing duration semantics are clear; no per-person leaderboard.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Collapse the panel; no data mutation.

### M26-MN-006 — Tester analytics

- **Test ID:** M26-MN-006
- **Feature area:** Tester analytics
- **Priority:** High
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Ordinary developer and signed-out visitor**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/admin/submissions`.
  2. Sign out and try Admin Review/the tester analytics API URL.
  3. Sign in as an ordinary developer and repeat.
  4. Use browser Network tools to inspect the API status.
- **Expected result:** No metrics are visible; API rejects anonymous with 401 and ordinary user with 403.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Sign out afterwards.

### M26-MN-007 — Availability

- **Test ID:** M26-MN-007
- **Feature area:** Availability
- **Priority:** Critical
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Tester without an active reservation**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/tester`.
  2. Use the safe browser fixture runner listed below if no QA campaign is full.
  3. Open a full QA campaign.
  4. Click Notify me when a place opens, then inspect the saved/cancel state.
- **Expected result:** All places taken is clear; one optional request is saved with 30-day/first-come wording and no email permission.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Cancel the request before leaving unless testing delivery next.

### M26-MN-008 — Availability

- **Test ID:** M26-MN-008
- **Feature area:** Availability
- **Priority:** Critical
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Waiting tester**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/tester`.
  2. On a full QA game, request availability.
  3. Click Cancel availability notification.
  4. Reopen the page and verify the request remains cancelled.
- **Expected result:** No later alert is generated for that cancelled request; already delivered notifications are separate.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Leave the preference cancelled.

### M26-MN-009 — Availability

- **Test ID:** M26-MN-009
- **Feature area:** Availability
- **Priority:** Critical
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Two separate QA testers**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/tester`.
  2. With tester A holding a dedicated QA reservation, have tester B request its full campaign.
  3. Release only tester A’s dedicated reservation.
  4. As B open the notification bell and click Testing place available.
- **Expected result:** One operational alert opens the correct game/campaign; it reveals no other tester and does not guarantee a place.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Cancel B’s request and release any reservation claimed solely for this test.

### M26-MN-010 — Availability expiry

- **Test ID:** M26-MN-010
- **Feature area:** Availability expiry
- **Priority:** Critical
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Local operator**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/tester`.
  2. Run node tests/test-merge26-availability.mjs from the repository terminal.
  3. Read the server-time expiry/future-deadline assertions.
  4. Run node tests/test-merge26-development-postflight.mjs and confirm the development job is active/succeeded.
- **Expected result:** Controlled expired fixtures alert once without 72 real hours; future/extended deadlines are not expired; no real QA deadline was edited.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Both fixture database and processor tests clean up automatically or are read-only.

### M26-MN-011 — Availability capacity

- **Test ID:** M26-MN-011
- **Feature area:** Availability capacity
- **Priority:** Critical
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Local operator**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/tester`.
  2. Run node tests/test-merge26-concurrency.mjs.
  3. Review last-place, one-active-test and duplicate-release/expiry results.
  4. If manually claiming an alerted real QA place, recheck current capacity first.
- **Expected result:** One last-place winner, no automatic reservation and no bypass of one-active-test rules.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Disposable container removes itself; release only any manual QA reservation you created.

### M26-MN-012 — Catalogue

- **Test ID:** M26-MN-012
- **Feature area:** Catalogue
- **Priority:** High
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Signed-out visitor**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/`.
  2. Select Featured and compare rated/unrated developer games and imported games.
  3. Use genre/search/source filters and navigate pages.
  4. Try Recently added, Highest rated and Title A-Z.
- **Expected result:** Featured groups and score order are consistent across pages; alternate primary sorts and filters still work.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Clear filters; no data changes.

### M26-MN-013 — Developer saves

- **Test ID:** M26-MN-013
- **Feature area:** Developer saves
- **Priority:** High
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Owning developer**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/my-submissions`.
  2. Select a dedicated QA game; edit and save a non-material field, contact preference or video link.
  3. Confirm one fixed success toast and scroll to navigation.
  4. Restore the original value and save.
- **Expected result:** Toast appears after success, remains visible after scrolling, and edits are not duplicated.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Restore every changed QA field/preference.

### M26-MN-014 — Developer failed save

- **Test ID:** M26-MN-014
- **Feature area:** Developer failed save
- **Priority:** High
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Owning developer**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/my-submissions`.
  2. Make an unsaved QA edit.
  3. Use browser Network tools Offline temporarily, then click Save.
  4. Return Online and inspect the field/position before retrying.
- **Expected result:** Useful error, retained edit/position and no false success toast.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Return Online and discard or restore the QA edit.

### M26-MN-015 — Archive/restore

- **Test ID:** M26-MN-015
- **Feature area:** Archive/restore
- **Priority:** High
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Owning developer and signed-out visitor**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/my-submissions`.
  2. Choose QA game, click Archive / unpublish and type its exact title.
  3. Check signed-out discovery and private game/build feedback.
  4. Restore listing.
- **Expected result:** Public discovery/new testing hide the archived game while authorised history and acquisition remain.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Restore the original listing state.

### M26-MN-016 — Eligible deletion

- **Test ID:** M26-MN-016
- **Feature area:** Eligible deletion
- **Priority:** Critical
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Developer**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/submit`.
  2. Create a fresh clearly labelled disposable QA submission without campaigns or reviews.
  3. Open its management card, choose Delete unapproved submission and confirm its title.
  4. Try the same action on an approved/history-bearing QA game.
- **Expected result:** Only the eligible fresh record deletes; approved or dependent history is protected and archive remains available.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Delete only the fresh eligible record or archive it if a review dependency exists.

### M26-MN-017 — Admin Test/Demo

- **Test ID:** M26-MN-017
- **Feature area:** Admin Test/Demo
- **Priority:** High
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Administrator and ordinary tester**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/admin/submissions`.
  2. Select a dedicated QA submission and enable Admin Test / Demo.
  3. Check signed-out catalogue/game media, ordinary Tester Hub and genuine acquisition reporting.
  4. Verify private owner/admin management, then clear the flag.
- **Expected result:** Explicit test data is excluded publicly and from genuine metrics; private workflows remain; genuine admin-owned games are not automatically marked.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Restore the original flag.

### M26-MN-018 — Admin ordering

- **Test ID:** M26-MN-018
- **Feature area:** Admin ordering
- **Priority:** High
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Administrator**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/admin/submissions`.
  2. Use Approved, Pending Review, Needs More Information and Rejected filters.
  3. Compare the latest real decision/submission activities.
  4. Use Needs attention/All and change search/selection.
- **Expected result:** Relevant activity order and Needs More Information priority are preserved across the loaded set; selection/search work.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Do not create new decisions merely to alter genuine ordering.

### M26-MN-019 — Reassessment

- **Test ID:** M26-MN-019
- **Feature area:** Reassessment
- **Priority:** High
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Owning QA developer and administrator**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/my-submissions`.
  2. Use a dedicated approved QA listing to change a material AI disclosure.
  3. Inspect Listing changes and reassessments and the developer-visible reason.
  4. Complete/publish a genuinely fresh assessment before confirming reassessment with a reason.
- **Expected result:** Pending work is not automatically cleared; valid confirmation leaves the queue and preserves the audit reason.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Keep truthful QA disclosures and review history; do not clear an unrelated existing reassessment.

### M26-MN-020 — Existing developer alerts

- **Test ID:** M26-MN-020
- **Feature area:** Existing developer alerts
- **Priority:** High
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **QA tester, admin, owning developer**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/tester`.
  2. Submit a QA report without accepting it; check the owner bell.
  3. Accept it through moderation.
  4. Check the owning developer’s bell/build results and an unrelated developer’s bell.
- **Expected result:** Only accepted availability triggers the intended developer feedback alert, once, opening the correct game/build; unrelated recipients get none.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Retain QA feedback/audit and mark/dismiss only your own QA notifications as desired.

### M26-MN-021 — Analytics consent

- **Test ID:** M26-MN-021
- **Feature area:** Analytics consent
- **Priority:** High
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Signed-out visitor and administrator**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/`.
  2. Use a fresh browser context; decline optional footer analytics and navigate.
  3. Allow analytics, navigate, then reject it again.
  4. As admin, inspect the detailed visitor/acquisition report.
- **Expected result:** No pre-consent/refused events; consented tab sessions can appear; withdrawal stops later events; these are not verified unique people.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Return the test browser preference to Off; dedicated automated browser test removes its exact synthetic event.

### M26-MN-022 — Acquisition

- **Test ID:** M26-MN-022
- **Feature area:** Acquisition
- **Priority:** High
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Administrator**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/admin/analytics`.
  2. Review source/campaign versus voluntary discovery text.
  3. Compare submission records, current Approved count and distinct developers.
  4. Compare an archived genuine QA record and an explicitly marked Test/Demo record.
- **Expected result:** Unknown stays unknown; no invented registration conversion; archived genuine history remains and explicit demo activity is excluded.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Restore any QA visibility flags changed for this check.

### M26-MN-023 — Disclosure accessibility

- **Test ID:** M26-MN-023
- **Feature area:** Disclosure accessibility
- **Priority:** High
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Any appropriate role**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/admin/submissions`.
  2. Tab to analytics/catalogue/listing controls and use Enter/Space.
  3. Enter a harmless unsaved catalogue input, collapse/reopen and verify it persists.
  4. Check Tester Hub details and developer feedback controls without activating adjacent actions.
- **Expected result:** Square + / expanded diamond control, correct expanded state/controlled region, visible focus, retained form state and no accidental action.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Clear unsaved catalogue input; do not import or submit anything.

### M26-MN-024 — Screen reader

- **Test ID:** M26-MN-024
- **Feature area:** Screen reader
- **Priority:** High
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Administrator or tester with Windows Narrator**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/tester`.
  2. Enable Narrator using Ctrl+Windows+Enter.
  3. Tab through game/disclosure controls and listen to names and expanded state.
  4. Repeat the admin analytics controls and disable Narrator.
- **Expected result:** Controls and states are meaningfully announced; hidden content is not presented as expanded. This requires a real human assistive-technology check.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Disable Narrator if enabled solely for this test.

### M26-MN-025 — Mobile/zoom

- **Test ID:** M26-MN-025
- **Feature area:** Mobile/zoom
- **Priority:** High
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Developer, tester and admin**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/my-submissions`.
  2. Set browser zoom to 150%, then use a narrow/mobile viewport.
  3. Open/save/cancel a QA management form and inspect analytics tables, labels, bell and game cards.
  4. Open a game thumbnail and return to Tester Hub.
- **Expected result:** Readable controls with no page-wide horizontal overflow; local table scrolling is usable; return position and disclosure selection remain sensible.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Restore normal zoom and original QA data.

### M26-MN-026 — Reduced motion

- **Test ID:** M26-MN-026
- **Feature area:** Reduced motion
- **Priority:** High
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Any role**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/my-submissions`.
  2. Enable the OS/browser reduced-motion preference.
  3. Save a harmless QA preference and toggle disclosures.
  4. Restore the preference value.
- **Expected result:** Successful save reaches navigation without forced smooth animation; disclosure transitions respect reduced motion.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Restore the QA value and OS setting if changed for the test.

### M26-MN-027 — Rights and privacy approval

- **Test ID:** M26-MN-027
- **Feature area:** Rights and privacy approval
- **Priority:** Critical
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Owner/legal reviewer**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/privacy`.
  2. Read MERGE-26-PRIVACY-REVIEW.md and the draft notice additions.
  3. Review persistent public linkage, lawful bases, retention, processors/transfers and rights-handling procedure.
  4. Record decisions and final notice effective date before any production release.
- **Expected result:** Unresolved legal/privacy decisions are explicitly approved or remain release gates; technical passes are not treated as legal compliance.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** No personal records are deleted by this document review.

### M26-MN-028 — Production release gate

- **Test ID:** M26-MN-028
- **Feature area:** Production release gate
- **Priority:** Critical
- **Test type:** Manual
- **Preconditions:** Localhost connected to development; role: **Owner/release operator**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/`.
  2. Review release notes, migration order, scheduler and rollback prerequisites.
  3. Arrange a fresh production backup and production-schema review only under separate future authorisation.
  4. Approve deployment only after localhost/privacy acceptance.
- **Expected result:** No production query/write/migration, v11 merge or Render deployment is performed by this Merge 26 implementation run.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** No production action is authorised by this test plan.

## MY MANUAL LOCALHOST ACCEPTANCE WALKTHROUGH

1. **Environment / signed out:** Open localhost, verify the Network Supabase hostname is development (MN-001). A production hostname or unexpected authenticated account is a stop condition. No time manipulation.
2. **Visitor:** On Home, exercise Featured, filters, pagination and other sorts (MN-012). Failure is inconsistent tier/filter order or missing genuine games. No writes.
3. **Owner developer:** Open My submissions for QA A; save a harmless edit, test failed-save Offline once, restore the value (MN-013/014). Expect one confirmed toast/top navigation; failure must retain edits.
4. **Owner + visitor:** Archive QA A, check public hiding/private history, restore (MN-015). Create/delete a fresh disposable unreviewed submission (MN-016); historical/approved hard deletion must refuse.
5. **Admin:** Open Admin Review, select QA A, toggle Admin Test/Demo, verify ordinary/public exclusion and private access, then clear it (MN-017). Check review ordering and legitimate reassessment (MN-018/019); do not clear existing unrelated work.
6. **QA tester → admin → developer → visitor:** Submit a dedicated QA report, moderate with a reason, inspect owner-only notification and accepted public number/current rank (MN-002/003/004/020). Requires accepted QA reports for label comparison; never adjust real XP just to force promotion. Controlled rank tests are automated ID-003/004.
7. **Admin:** Expand Tester Analytics, inspect definitions and all rank tiers (MN-005), then verify an ordinary account is denied (MN-006). Empty and malformed-data boundaries are supplied by the disposable analytics suite.
8. **Two QA testers:** Opt into a full QA campaign, release only the other tester’s dedicated reservation, click the single bell and cancel the request (MN-007/008/009). If safe full fixtures are unavailable, run the development release-browser test, which creates and cleans only its own synthetic holders. Never release another person’s reservation.
9. **Operator:** Run the expiry/concurrency fixture commands (MN-010/011). These simulate past deadlines in disposable databases and require **no 72-hour real wait**. The real development cron job was separately checked as active/succeeded.
10. **Visitor + admin:** Test analytics decline/allow/withdraw and inspect source versus voluntary discovery text (MN-021/022). Unknown is legitimate; no registration conversion is implied.
11. **All relevant roles:** Use keyboard controls, an unsaved disclosure input, 150% browser zoom/mobile, thumbnail-return flow, Narrator and reduced motion (MN-023–026). Failure includes lost unsaved input, inaccessible focus/state, accidental neighbouring action or page-wide overflow.
12. **Owner/legal:** Complete the privacy/retention/notice decisions, manual observations and future release gates (MN-027/028). No production migration, merge or deployment is authorised by this walkthrough.

## Operational release checks and remaining gates

- All migrations and development application status are listed in `MERGE-26-RELEASE-NOTES.md`. Production schema comparison/backup/restore readiness and explicit deployment authorisation are pending future release work, not executed tests.
- Scheduler: development job `merge26-tester-availability`, every minute; deployment must configure and verify this separately in production. No new app environment variables. Missing scheduler means delayed/missing expiry alerts even though reservation deadlines/capacity remain server-enforced.
- Rollback must preserve public-number allocation/tombstones and historical records. Do not reset identity sequences or drop genuine feedback data. See release notes.
- Legal/DPIA/LIA/retention/processor decisions are documented in the privacy review. No technical test can approve them.
