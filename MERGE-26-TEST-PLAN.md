# Merge 26 complete test catalogue

Evidence snapshot: 2026-11-05T12:30:47.515Z. Environment: localhost and development `ktifgybnkdaotdxrvjgq`, plus disposable network-isolated PostgreSQL/PGlite fixtures. Production was not accessed.

## Execution summary

| Measure | Actual count |
|---|---:|
| Total catalogue cases | 228 |
| Automated cases passed | 189 |
| Automated cases failed | 0 |
| Manual owner acceptance cases pending | 39 |
| Blocked/unexecuted automated cases | 0 |
| Executed suites/checks passed | 36 |
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
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

### M26-OS-001 — OS shared selector

- **Test ID:** M26-OS-001
- **Feature area:** OS shared selector
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-os-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-os-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** All five supported OS selections immediately update the controlled Account field; legacy saved values remain selectable.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/os-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-OS-002 — OS shared selector

- **Test ID:** M26-OS-002
- **Feature area:** OS shared selector
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-os-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-os-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Minimum/recommended Linux/macOS selections persist through collapse/reopen and fixture reload without altering CPU/GPU IDs.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/os-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-OS-003 — OS keyboard/layout

- **Test ID:** M26-OS-003
- **Feature area:** OS keyboard/layout
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-os-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-os-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Arrow/Enter selection, Escape and focus work at desktop/mobile 100/125/150 percent CSS zoom with no page overflow.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/os-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-OS-004 — OS real persistence

- **Test ID:** M26-OS-004
- **Feature area:** OS real persistence
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-pc-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-pc-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Account Windows11 saves/reloads in development with private hardware preserved; Tester Hardware heading/privacy guidance remain.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/pc-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-OS-005 — OS real persistence

- **Test ID:** M26-OS-005
- **Feature area:** OS real persistence
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-pc-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-pc-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Real listing minimum Linux/recommended macOS saves/reloads; Other is retained on a new optional submission.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/pc-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-OS-006 — Hardware regression

- **Test ID:** M26-OS-006
- **Feature area:** Hardware regression
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-hardware.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-hardware.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Working CPU/GPU search, canonical IDs, aliases, custom values and keyboard/collapse behaviour remain unchanged.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/hardware.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-01 — Finalisation notification navigation

- **Test ID:** M26-FINAL-01
- **Feature area:** Finalisation notification navigation
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-finalisation-development.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-finalisation-development.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Real owner bell click and direct URL select the correct game/campaign Individual responses; Back/Forward work and QA read_at is restored.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/finalisation-development.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-02 — Finalisation authorisation

- **Test ID:** M26-FINAL-02
- **Feature area:** Finalisation authorisation
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-finalisation-development.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-finalisation-development.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Actual admin rubric/queue succeeds; ordinary tester is denied admin review and unrelated private developer feedback.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/finalisation-development.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-03 — DEV QA identification

- **Test ID:** M26-FINAL-03
- **Feature area:** DEV QA identification
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Explicit line-leading [DEV QA] feedback gets one compact label; ordinary mid-sentence references do not.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-04 — Historical artwork

- **Test ID:** M26-FINAL-04
- **Feature area:** Historical artwork
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-finalisation-development.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-finalisation-development.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Both existing accepted/rejected QA records load real existing JPEG thumbnails with naturalWidth greater than zero.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/finalisation-development.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-05 — Historical artwork

- **Test ID:** M26-FINAL-05
- **Feature area:** Historical artwork
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Private history uses published image override for the same source game, preserving owner scope.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-06 — Historical artwork

- **Test ID:** M26-FINAL-06
- **Feature area:** Historical artwork
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Imported-game own history resolves its actual imported ID/title/image, separate from submitted/approved source.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-07 — Historical artwork

- **Test ID:** M26-FINAL-07
- **Feature area:** Historical artwork
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Genuinely missing/failed artwork falls back; a pending lazy image is not treated as failed.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-08 — XP review history

- **Test ID:** M26-FINAL-08
- **Feature area:** XP review history
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-finalisation-development.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-finalisation-development.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Existing accepted/rejected outcomes, reasons, event counts and XP remain intact after navigation/collapse/mobile/150% checks.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/finalisation-development.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-09 — XP review history

- **Test ID:** M26-FINAL-09
- **Feature area:** XP review history
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-testing-policy.mjs --graded-quality`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-testing-policy.mjs --graded-quality`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Partial awards, re-review/reconsideration and XP corrections remain correct in disposable graded-quality tests.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/xp-quality.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-10 — Hardware catalogue

- **Test ID:** M26-FINAL-10
- **Feature area:** Hardware catalogue
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-hardware.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-hardware.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** CPU and GPU catalogues have unique separate canonical IDs with standard display labels.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/hardware.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-11 — Hardware catalogue

- **Test ID:** M26-FINAL-11
- **Feature area:** Hardware catalogue
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-hardware.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-hardware.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** RTX4070TI, 4070 ti and NVIDIA 4070 Ti resolve to one model without ambiguous cross-type matches.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/hardware.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-12 — Hardware catalogue

- **Test ID:** M26-FINAL-12
- **Feature area:** Hardware catalogue
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-hardware.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-hardware.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Manufacturer/model search and no-results state work in the actual shared selector.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/hardware.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-13 — Hardware catalogue

- **Test ID:** M26-FINAL-13
- **Feature area:** Hardware catalogue
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-hardware.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-hardware.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Other values are explicitly custom and bounded; legacy unknown strings are preserved, not labelled canonical.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/hardware.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-14 — Hardware catalogue

- **Test ID:** M26-FINAL-14
- **Feature area:** Hardware catalogue
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-hardware.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-hardware.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Actual account/minimum requirements selectors retain canonical values across disclosure collapse; keyboard, mobile and CSS150% work.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/hardware.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-15 — Hardware persistence/privacy

- **Test ID:** M26-FINAL-15
- **Feature area:** Hardware persistence/privacy
- **Priority:** Critical
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-pc-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-pc-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Actual Account and minimum/recommended Submit/Edit save/reload/clear preserve private versus public hardware separation and failed edits.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/pc-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-16 — Hardware validation

- **Test ID:** M26-FINAL-16
- **Feature area:** Hardware validation
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-pc.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-pc.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Existing server whitelist/length/numeric bounds and RLS remain enforced for canonical/custom strings.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/pc.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-17 — Entitlement presentation

- **Test ID:** M26-FINAL-17
- **Feature area:** Entitlement presentation
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-developer-workspace.mjs --plans-browser`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-developer-workspace.mjs --plans-browser`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Free Bronze is available, higher ranks/genre matching are Locked, Pro enables them, and grandfathered targeting can be retained/lowered.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/plan-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-18 — Entitlement server enforcement

- **Test ID:** M26-FINAL-18
- **Feature area:** Entitlement server enforcement
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-developer-launch-limit.mjs --plans`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-developer-launch-limit.mjs --plans`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Altered Free targeting writes are rejected; authorised Pro settings and published grandfathering survive downgrade without stronger restrictions.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/plan-policy.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-19 — Launch contract

- **Test ID:** M26-FINAL-19
- **Feature area:** Launch contract
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-developer-launch-limit.mjs --plans`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-developer-launch-limit.mjs --plans`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Forward five-launch Pro policy preserves historical usage, exact rolling quota boundaries, 48-hour gap and Free one-launch policy.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/plan-policy.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-20 — Campaign capacity

- **Test ID:** M26-FINAL-20
- **Feature area:** Campaign capacity
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-developer-launch-limit.mjs --plans`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-developer-launch-limit.mjs --plans`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** New rounds use three places while existing saved capacities/claims/history remain unchanged through policy migration.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/plan-policy.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-21 — QA capacity correction

- **Test ID:** M26-FINAL-21
- **Feature area:** QA capacity correction
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-qa-capacity.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-qa-capacity.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Actual frozen saved-capacity trigger is reproduced; guarded correction changes only the named QA row, restores trigger and preserves both XP/outcomes.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/qa-capacity.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-22 — QA capacity correction

- **Test ID:** M26-FINAL-22
- **Feature area:** QA capacity correction
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-qa-capacity.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-qa-capacity.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Idempotency, occupied-capacity refusal, rollback and unrelated campaign preservation pass.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/qa-capacity.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FINAL-23 — Development configuration

- **Test ID:** M26-FINAL-23
- **Feature area:** Development configuration
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-development-postflight.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-development-postflight.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Actual development default and QA capacity are three; Pro is five with 48-hour gap, freeze trigger restored and privacy/scheduler checks pass.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/development-postflight.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-F01 — Focused regressions

- **Test ID:** M26-FU-F01
- **Feature area:** Focused regressions
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-pc-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-pc-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Private PC account save/clear/comparison remains operational.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/pc-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-F02 — Focused regressions

- **Test ID:** M26-FU-F02
- **Feature area:** Focused regressions
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-pc.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-pc.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Optional game minimum/recommended requirements and public/private permissions remain intact.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/pc.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-F03 — Focused regressions

- **Test ID:** M26-FU-F03
- **Feature area:** Focused regressions
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-48-hours.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-48-hours.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** New 48-hour reservation deadlines and grandfathered issued timestamps remain correct.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/48-hours.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-F04 — Focused regressions

- **Test ID:** M26-FU-F04
- **Feature area:** Focused regressions
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-48-hours.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-48-hours.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Server expiry retains drafts and frees capacity correctly.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/48-hours.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-F05 — Focused regressions

- **Test ID:** M26-FU-F05
- **Feature area:** Focused regressions
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-availability.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-availability.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Tester availability notifications preserve opt-in and deduplication.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/availability.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-F06 — Focused regressions

- **Test ID:** M26-FU-F06
- **Feature area:** Focused regressions
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-feedback-approval.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-feedback-approval.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Owner developer approval notifications preserve routing and transaction guarantees.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/feedback-approval.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-F07 — Focused regressions

- **Test ID:** M26-FU-F07
- **Feature area:** Focused regressions
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-tester-identity.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-tester-identity.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Tester public numbers/current rank assertions remain passed from the prior unchanged identity scope.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/identity.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-F08 — Focused regressions

- **Test ID:** M26-FU-F08
- **Feature area:** Focused regressions
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-tester-analytics.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-tester-analytics.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Existing Admin Tester Analytics assertions remain passed from the prior unchanged aggregation scope.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/tester-analytics.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-F09 — Focused regressions

- **Test ID:** M26-FU-F09
- **Feature area:** Focused regressions
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Existing acquisition/cohort assertions remain passed from the prior unchanged report scope.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/core.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-F10 — Focused regressions

- **Test ID:** M26-FU-F10
- **Feature area:** Focused regressions
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Existing Featured catalogue sort/filter/page assertions remain passed from the prior unchanged catalogue scope.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/core.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-F11 — Focused regressions

- **Test ID:** M26-FU-F11
- **Feature area:** Focused regressions
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-submission-corrections.mjs --listings`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-submission-corrections.mjs --listings`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Existing developer listing edit/reassessment assertions remain passed from the prior unchanged listing RPC scope.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/listings.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-F12 — Focused regressions

- **Test ID:** M26-FU-F12
- **Feature area:** Focused regressions
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-testing-policy.mjs --graded-quality`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-testing-policy.mjs --graded-quality`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Graded XP, quality moderation and reconsideration audit tests pass.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/xp-quality.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-F13 — Focused regressions

- **Test ID:** M26-FU-F13
- **Feature area:** Focused regressions
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-bell-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-bell-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Existing bell counts/read actions and visible/focus refresh remain operational.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/bell-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-F14 — Focused regressions

- **Test ID:** M26-FU-F14
- **Feature area:** Focused regressions
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-routes.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-routes.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Optional analytics refusal/withdrawal/purpose renewal and server consent/privacy controls remain enforced.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-routes.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-A01 — Developer usefulness

- **Test ID:** M26-FU-A01
- **Feature area:** Developer usefulness
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Admin reviewed cards render Developer marked useful with shared green badge.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-A02 — Developer usefulness

- **Test ID:** M26-FU-A02
- **Feature area:** Developer usefulness
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Admin reviewed cards render Developer marked not useful with distinct muted styling.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-A03 — Developer usefulness

- **Test ID:** M26-FU-A03
- **Feature area:** Developer usefulness
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Admin reviewed cards render null assessments as Not yet rated by developer.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-A04 — Developer usefulness

- **Test ID:** M26-FU-A04
- **Feature area:** Developer usefulness
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Actual Admin Review and Testing Activity header components use identical three-state semantics.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-A05 — Developer usefulness

- **Test ID:** M26-FU-A05
- **Feature area:** Developer usefulness
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** The existing owner usefulness RPC does not change the 80 XP award.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-A06 — Developer usefulness

- **Test ID:** M26-FU-A06
- **Feature area:** Developer usefulness
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** The existing owner usefulness RPC does not change accepted moderation outcome.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-A07 — Developer usefulness

- **Test ID:** M26-FU-A07
- **Feature area:** Developer usefulness
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Legacy reviewed card with missing usefulness renders neutral without inventing assessment.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-B01 — Testing Activity history

- **Test ID:** M26-FU-B01
- **Feature area:** Testing Activity history
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Own active-game metadata returns the actual image URL.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-B02 — Testing Activity history

- **Test ID:** M26-FU-B02
- **Feature area:** Testing Activity history
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Own archived-game artwork remains available through restricted own-report lookup.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-B03 — Testing Activity history

- **Test ID:** M26-FU-B03
- **Feature area:** Testing Activity history
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Missing and failed artwork show graceful fallback, including failure before hydration.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-B04 — Testing Activity history

- **Test ID:** M26-FU-B04
- **Feature area:** Testing Activity history
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Original developer_name is returned rather than fabricated from the tester profile.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-B06 — Testing Activity history

- **Test ID:** M26-FU-B06
- **Feature area:** Testing Activity history
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Compact actual history header shows Accepted separately from developer usefulness.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-B08 — Testing Activity history

- **Test ID:** M26-FU-B08
- **Feature area:** Testing Activity history
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** All three developer assessment values display correctly in history header.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-B11 — Testing Activity history

- **Test ID:** M26-FU-B11
- **Feature area:** Testing Activity history
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Actual shared history/header/referral components fit 390px viewport without page overflow.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-B12 — Testing Activity history

- **Test ID:** M26-FU-B12
- **Feature area:** Testing Activity history
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Actual components fit 150% CSS zoom without horizontal page overflow; browser toolbar zoom remains manual.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-B14 — Testing Activity history

- **Test ID:** M26-FU-B14
- **Feature area:** Testing Activity history
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-steam-development.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-steam-development.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Hosted own-history metadata contains only reports belonging to the signed-in development tester.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-development.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-C01 — Storefront links

- **Test ID:** M26-FU-C01
- **Feature area:** Storefront links
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-routes.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-routes.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** A valid saved numeric Steam app URL labels View Steam Page.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-routes.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-C02 — Storefront links

- **Test ID:** M26-FU-C02
- **Feature area:** Storefront links
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-routes.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-routes.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** A valid creator.itch.io game URL labels View itch.io page, never Steam.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-routes.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-C03 — Storefront links

- **Test ID:** M26-FU-C03
- **Feature area:** Storefront links
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-routes.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-routes.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Missing destination is rejected by the link helper.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-routes.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-C04 — Storefront links

- **Test ID:** M26-FU-C04
- **Feature area:** Storefront links
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-routes.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-routes.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Arbitrary hosts, malformed URLs, credentials and unexpected ports are rejected.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-routes.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-C05 — Storefront links

- **Test ID:** M26-FU-C05
- **Feature area:** Storefront links
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-routes.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-routes.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** javascript, data and insecure http destinations are rejected.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-routes.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-C06 — Storefront links

- **Test ID:** M26-FU-C06
- **Feature area:** Storefront links
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Real link activation opens the exact destination in a new tab (destination network mocked).
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-C07 — Storefront links

- **Test ID:** M26-FU-C07
- **Feature area:** Storefront links
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** New tab navigation preserves existing Results selector state in the original page.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-C08 — Storefront links

- **Test ID:** M26-FU-C08
- **Feature area:** Storefront links
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Archived own-history metadata retains the original valid store URL.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-C09 — Storefront links

- **Test ID:** M26-FU-C09
- **Feature area:** Storefront links
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-routes.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-routes.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** No helper derives a store URL from a game title; unsupported destinations return null.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-routes.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-D01 — Steam recording

- **Test ID:** M26-FU-D01
- **Feature area:** Steam recording
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** One deliberate primary click submits one event; no render/prefetch submission.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-D02 — Steam recording

- **Test ID:** M26-FU-D02
- **Feature area:** Steam recording
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Event uses the actual source game UUID and kind resolved from the owned report.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-D03 — Steam recording

- **Test ID:** M26-FU-D03
- **Feature area:** Steam recording
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Stored source is exactly tester_activity.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-D04 — Steam recording

- **Test ID:** M26-FU-D04
- **Feature area:** Steam recording
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-routes.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-routes.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Catalogue/Home does not mount the activity tracking link.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-routes.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-D05 — Steam recording

- **Test ID:** M26-FU-D05
- **Feature area:** Steam recording
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-routes.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-routes.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Game details do not mount the activity tracking link.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-routes.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-D06 — Steam recording

- **Test ID:** M26-FU-D06
- **Feature area:** Steam recording
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-steam-development.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-steam-development.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Real admin-originated recording is rejected; no admin UI tracking link exists.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-development.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-D07 — Steam recording

- **Test ID:** M26-FU-D07
- **Feature area:** Steam recording
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** itch.io activation opens normally without a Steam analytics request.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-D08 — Steam recording

- **Test ID:** M26-FU-D08
- **Feature area:** Steam recording
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Rendering and opening the fixture do not record clicks.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-D09 — Steam recording

- **Test ID:** M26-FU-D09
- **Feature area:** Steam recording
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Retrying the same event UUID produces one event; a separate UUID counts separately.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-D10 — Steam recording

- **Test ID:** M26-FU-D10
- **Feature area:** Steam recording
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Repeated deliberate primary activations generate distinct event IDs.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-D11 — Steam recording

- **Test ID:** M26-FU-D11
- **Feature area:** Steam recording
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Network failure of analytics never blocks direct external navigation.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-D12 — Steam recording

- **Test ID:** M26-FU-D12
- **Feature area:** Steam recording
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** No choice, refusal and old general permission suppress recording; Steam still opens.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-D13 — Steam recording

- **Test ID:** M26-FU-D13
- **Feature area:** Steam recording
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Withdrawal suppresses future recording without disabling Steam links.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-D14 — Steam recording

- **Test ID:** M26-FU-D14
- **Feature area:** Steam recording
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Event schema has only event UUID, game UUID/type, constant source and server time; no personal/session fields.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-D16 — Steam recording

- **Test ID:** M26-FU-D16
- **Feature area:** Steam recording
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Server-derived expired own reservations qualify from Testing Activity without changing stored drafts; current active claims remain excluded.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-D15 — Steam recording

- **Test ID:** M26-FU-D15
- **Feature area:** Steam recording
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Archiving and renaming preserve game attribution and counts.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E01 — Admin Steam referrals

- **Test ID:** M26-FU-E01
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Total qualifying clicks matches seeded SQL events.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E02 — Admin Steam referrals

- **Test ID:** M26-FU-E02
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Distinct games counts game ID/type groups, not report rows.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E03 — Admin Steam referrals

- **Test ID:** M26-FU-E03
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** All per-game counts sum exactly to overview total.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E04 — Admin Steam referrals

- **Test ID:** M26-FU-E04
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Two-click game precedes one-click games.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E05 — Admin Steam referrals

- **Test ID:** M26-FU-E05
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Equal counts sort deterministically by stable kind/ID, unaffected by title changes.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E06 — Admin Steam referrals

- **Test ID:** M26-FU-E06
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Top 10 displays at most 10 games.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E07 — Admin Steam referrals

- **Test ID:** M26-FU-E07
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Top 25 displays at most 25 games.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E08 — Admin Steam referrals

- **Test ID:** M26-FU-E08
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Top 50 displays at most 50 games.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E09 — Admin Steam referrals

- **Test ID:** M26-FU-E09
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** All loads 142 aggregate game rows across bounded 100-row requests.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E10 — Admin Steam referrals

- **Test ID:** M26-FU-E10
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Selector changes do not change overview totals.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E11 — Admin Steam referrals

- **Test ID:** M26-FU-E11
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Footer reports actual displayed/total game counts.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E12 — Admin Steam referrals

- **Test ID:** M26-FU-E12
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** A one-game dataset returns one result for Top 10.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E13 — Admin Steam referrals

- **Test ID:** M26-FU-E13
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Empty results have useful consent-aware wording and Showing 0 of 0 games.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E14 — Admin Steam referrals

- **Test ID:** M26-FU-E14
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** 142-game All list is height-limited and uses aggregate pagination, not raw event history.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E15 — Admin Steam referrals

- **Test ID:** M26-FU-E15
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Collapse/reopen retains All selection and fetched list.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E16 — Admin Steam referrals

- **Test ID:** M26-FU-E16
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Results UI works at mobile width and 150% CSS zoom.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E17 — Admin Steam referrals

- **Test ID:** M26-FU-E17
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-steam-development.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-steam-development.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Real anonymous/tester HTTP access is denied and administrator aggregate HTTP access succeeds.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-development.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E18 — Admin Steam referrals

- **Test ID:** M26-FU-E18
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-steam-development.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-steam-development.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Admin payload contains aggregate games/counts, not tester account IDs.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-development.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E19 — Admin Steam referrals

- **Test ID:** M26-FU-E19
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Archived games retain recorded click totals.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E21 — Admin Steam referrals

- **Test ID:** M26-FU-E21
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Pinned aggregate cutoff excludes later events so All pages keep stable counts while new clicks arrive.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-FU-E20 — Admin Steam referrals

- **Test ID:** M26-FU-E20
- **Feature area:** Admin Steam referrals
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-steam-referrals.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-steam-referrals.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Source/view joins do not multiply counts; overview and per-game totals reconcile.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/steam-sql.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-PC-009 — Game requirements

- **Test ID:** M26-PC-009
- **Feature area:** Game requirements
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-pc.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-pc.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Anonymous closed/private campaign references fail closed despite NULL auth.uid; approved source checks remain.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/pc.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-PC-001 — Private PC details

- **Test ID:** M26-PC-001
- **Feature area:** Private PC details
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-pc.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-pc.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Whitelist, numeric bounds, allowed optional fields and forbidden identifier keys validate in JS and SQL.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/pc.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-PC-002 — Private PC details

- **Test ID:** M26-PC-002
- **Feature area:** Private PC details
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-pc.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-pc.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Owner-only RLS supports save/edit/clear and denies cross-account/anonymous access.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/pc.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-PC-003 — Game requirements

- **Test ID:** M26-PC-003
- **Feature area:** Game requirements
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-pc.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-pc.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Canonical submitted/approved game requirements share one record and never reveal account specs.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/pc.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-PC-004 — Game requirements

- **Test ID:** M26-PC-004
- **Feature area:** Game requirements
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-pc.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-pc.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Atomic submission create retries are idempotent and transaction failures roll back game/requirements together.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/pc.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-PC-005 — Game requirements

- **Test ID:** M26-PC-005
- **Feature area:** Game requirements
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-pc.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-pc.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Private/pending/archived listing permissions and public min/recommended-only/removal states are preserved.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/pc.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-PC-006 — Private PC details

- **Test ID:** M26-PC-006
- **Feature area:** Private PC details
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-pc-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-pc-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Real development Account save, invalid-save retention, clear and cross-account privacy pass.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/pc-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-PC-007 — Game requirements

- **Test ID:** M26-PC-007
- **Feature area:** Game requirements
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-pc-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-pc-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Actual submit/edit/public requirement and private comparison workflows pass without AI reassessment changes.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/pc-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-PC-008 — Game requirements

- **Test ID:** M26-PC-008
- **Feature area:** Game requirements
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node --env-file=.env.local tests/test-merge26-pc-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node --env-file=.env.local tests/test-merge26-pc-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Actual shared requirement fields/disclosures work at mobile width and 150% CSS zoom.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/pc-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-RS-001 — 48-hour reservations

- **Test ID:** M26-RS-001
- **Feature area:** 48-hour reservations
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-48-hours.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-48-hours.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** New claims receive exact server-issued 48-hour deadlines.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/48-hours.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-RS-002 — 48-hour reservations

- **Test ID:** M26-RS-002
- **Feature area:** 48-hour reservations
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-48-hours.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-48-hours.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Issued 72-hour deadlines and unrelated capacity/policy values survive cutover.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/48-hours.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-RS-003 — 48-hour reservations

- **Test ID:** M26-RS-003
- **Feature area:** 48-hour reservations
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-48-hours.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-48-hours.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Boundary expiry releases capacity once and retains drafts; future/extended deadlines remain active.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/48-hours.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-RS-004 — 48-hour reservations

- **Test ID:** M26-RS-004
- **Feature area:** 48-hour reservations
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-concurrency.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-concurrency.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** One-active and last-place exclusivity survive concurrent requests.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/concurrency.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-NT-001 — Approval notifications

- **Test ID:** M26-NT-001
- **Feature area:** Approval notifications
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-feedback-approval.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-feedback-approval.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Acceptance persists an owner-only correctly titled/build-linked event in the same transaction.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/feedback-approval.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-NT-002 — Approval notifications

- **Test ID:** M26-NT-002
- **Feature area:** Approval notifications
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-feedback-approval.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-feedback-approval.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Rollback, submission, rejection, duplicate approval and former-owner situations do not produce an extra alert.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/feedback-approval.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-NT-003 — Approval notifications

- **Test ID:** M26-NT-003
- **Feature area:** Approval notifications
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-feedback-approval.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-feedback-approval.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Recipient-only read/unread and permissions remain; no tester UUID or private admin notes in message.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/feedback-approval.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

### M26-NT-004 — Approval notifications

- **Test ID:** M26-NT-004
- **Feature area:** Approval notifications
- **Priority:** High
- **Test type:** Automated
- **Required role:** Isolated test runner exercising owner/tester/developer/admin/anonymous roles as named in the criterion; hosted cases use dedicated development roles only.
- **Preconditions:** Dependencies installed; fixture runner supplies isolated roles/data. Development browser/postflight cases additionally require the verified development server/accounts; no production credentials.
- **Test data:** The dedicated synthetic/disposable fixtures in `node tests/test-merge26-bell-browser.mjs`; browser label number #114 is mocked, not a live account. Hosted browser tests use the safe QA games above and newly created synthetic accounts only.
- **Steps:**
  1. From the repository terminal run `node tests/test-merge26-bell-browser.mjs`.
  2. Verify its exit code and the assertions for the expected criterion below; inspect the named evidence log if unsuccessful.
- **Expected result:** Closed visible bell polls at 15 seconds, pauses hidden, refreshes focus/open and preserves mark-all-read.
- **Security/privacy expectation:** Respect the suite’s role checks; no private mappings or secrets in public output; no production access.
- **Actual result:** Executed automated suite passed; the mapped criterion is covered by its assertions. This is not manual acceptance.
- **Status:** Passed
- **Evidence:** `technical-test-results/m26-final/bell-browser.log`; committed suite status in `docs/MERGE-26-AUTOMATED-RESULTS.json`.
- **Cleanup:** Disposable database/container and temporary label route clean up automatically. Hosted integration removes its exact synthetic events/accounts/reservations and restores QA controls; legitimate feedback history is retained.

## Manual owner acceptance catalogue

The formal cases below retain their earlier pending scope. Later owner-reported component passes and resolved blockers are preserved in the dated acceptance ledger appended below; do not erase them or treat broader unexecuted steps as passed. Browser automation is recorded separately.

### M26-MN-001 — Environment

- **Test ID:** M26-MN-001
- **Feature area:** Environment
- **Priority:** Critical
- **Test type:** Manual
- **Required role:** All roles
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
- **Required role:** Tester, then admin, then signed-out visitor
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
- **Required role:** Same QA tester and visitor
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
- **Required role:** Administrator
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
- **Required role:** Administrator
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
- **Required role:** Ordinary developer and signed-out visitor
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
- **Required role:** Tester without an active reservation
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
- **Required role:** Waiting tester
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
- **Required role:** Two separate QA testers
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
- **Required role:** Local operator
- **Preconditions:** Localhost connected to development; role: **Local operator**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/tester`.
  2. Run node tests/test-merge26-availability.mjs from the repository terminal.
  3. Read the server-time expiry/future-deadline assertions.
  4. Run node tests/test-merge26-development-postflight.mjs and confirm the development job is active/succeeded.
- **Expected result:** Controlled expired fixtures alert once without 48 real hours; future/extended deadlines are not expired; no real QA deadline was edited.
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
- **Required role:** Local operator
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
- **Required role:** Signed-out visitor
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
- **Required role:** Owning developer
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
- **Required role:** Owning developer
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
- **Required role:** Owning developer and signed-out visitor
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
- **Required role:** Developer
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
- **Required role:** Administrator and ordinary tester
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
- **Required role:** Administrator
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
- **Required role:** Owning QA developer and administrator
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
- **Required role:** QA tester, admin, owning developer
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
- **Required role:** Signed-out visitor and administrator
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
- **Required role:** Administrator
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
- **Required role:** Any appropriate role
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
- **Required role:** Administrator or tester with Windows Narrator
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
- **Required role:** Developer, tester and admin
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
- **Required role:** Any role
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
- **Required role:** Owner/legal reviewer
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
- **Required role:** Owner/release operator
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

### M26-OS-M01 — Native OS popup acceptance

- **Test ID:** M26-OS-M01
- **Feature area:** Native OS popup acceptance
- **Priority:** High
- **Test type:** Manual
- **Required role:** Signed-in development account owner/developer
- **Preconditions:** Localhost connected to development; role: **Signed-in development account owner/developer**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/account#pc-specifications`.
  2. Expand My PC specifications and verify TESTER HARDWARE, white title, supporting description and privacy guidance.
  3. Use mouse and keyboard to choose Linux, macOS and Other; save/reload each as needed.
  4. Repeat in minimum/recommended Submit/Edit fields. Verify prior legacy OS can remain unchanged.
  5. At actual browser toolbar zoom 100,125,150 percent and mobile, open the native menu, use Escape/Enter, scroll surrounding panels and confirm CPU/GPU controls still work.
- **Expected result:** Selected OS is immediately visible and retained after save/reload; native menus remain usable, legacy strings are not replaced and privacy/disclosures/Save/Clear remain.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Restore only original QA OS/requirements or clear your own temporary specs; do not alter unrelated hardware or production.

### M26-FU-A08 — Developer usefulness permissions

- **Test ID:** M26-FU-A08
- **Feature area:** Developer usefulness permissions
- **Priority:** High
- **Test type:** Manual
- **Required role:** Anonymous and ordinary developer
- **Preconditions:** Localhost connected to development; role: **Anonymous and ordinary developer**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/admin/submissions?tab=playtests`.
  2. Attempt to open feedback review signed out.
  3. Sign in as an unrelated developer and repeat; inspect get_quality_review_queue network response.
- **Expected result:** No private review report or assessment is exposed; server rejects non-admin.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Sign out; do not modify records.

### M26-FU-B05 — Testing Activity timestamp

- **Test ID:** M26-FU-B05
- **Feature area:** Testing Activity timestamp
- **Priority:** High
- **Test type:** Manual
- **Required role:** Tester with dedicated submitted QA report
- **Preconditions:** Localhost connected to development; role: **Tester with dedicated submitted QA report**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/tester`.
  2. Open Testing activity.
  3. Compare the Submitted date/time with that report submitted_at using authorised development inspection; note browser timezone.
- **Expected result:** Timestamp corresponds to the actual submission, not reservation creation or an invented date.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Read-only; leave report unchanged.

### M26-FU-B07 — Testing Activity XP

- **Test ID:** M26-FU-B07
- **Feature area:** Testing Activity XP
- **Priority:** High
- **Test type:** Manual
- **Required role:** Tester with dedicated reviewed QA report
- **Preconditions:** Localhost connected to development; role: **Tester with dedicated reviewed QA report**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/tester`.
  2. Open Testing activity.
  3. Compare the existing quality/XP label with the actual review and XP history.
  4. Confirm developer usefulness does not replace the admin outcome.
- **Expected result:** The genuine current award and legacy missing-score explanation are preserved.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Read-only; do not change XP.

### M26-FU-B09 — Feedback disclosure

- **Test ID:** M26-FU-B09
- **Feature area:** Feedback disclosure
- **Priority:** High
- **Test type:** Manual
- **Required role:** Tester with dedicated submitted QA report
- **Preconditions:** Localhost connected to development; role: **Tester with dedicated submitted QA report**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/tester`.
  2. Open Testing activity.
  3. Expand View my submitted feedback, inspect all answers and collapse/reopen.
  4. Verify the answers match your original report.
- **Expected result:** Existing feedback disclosure remains readable and complete.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Read-only; leave history untouched.

### M26-FU-B10 — Reconsideration controls

- **Test ID:** M26-FU-B10
- **Feature area:** Reconsideration controls
- **Priority:** High
- **Test type:** Manual
- **Required role:** Tester with eligible rejected or partial-award QA report
- **Preconditions:** Localhost connected to development; role: **Tester with eligible rejected or partial-award QA report**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/tester`.
  2. Open Testing activity and the eligible report.
  3. Open reconsideration, enter a dedicated QA explanation and submit once.
  4. As administrator inspect the audit history; do not alter a genuine report.
- **Expected result:** Eligibility and existing audit trail remain; duplicate pending reconsiderations are rejected.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Retain intentional QA moderation history; close only the dedicated QA request with a reason if authorised.

### M26-FU-B13 — History accessibility

- **Test ID:** M26-FU-B13
- **Feature area:** History accessibility
- **Priority:** High
- **Test type:** Manual
- **Required role:** Tester and administrator
- **Preconditions:** Localhost connected to development; role: **Tester and administrator**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/tester`.
  2. Use Tab/Shift+Tab and Enter/Space through history disclosures, store link and Results selector.
  3. Use Narrator or another screen reader to inspect title, statuses, image fallback and external-link announcement.
  4. Repeat at 150% browser toolbar zoom and 390px mobile emulation.
- **Expected result:** Logical focus order, meaningful labels and no page-wide overflow; all controls operable.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Reset zoom/emulation; no writes.

### M26-FU-M01 — Full Steam acceptance

- **Test ID:** M26-FU-M01
- **Feature area:** Full Steam acceptance
- **Priority:** High
- **Test type:** Manual
- **Required role:** Tester then administrator
- **Preconditions:** Localhost connected to development; role: **Tester then administrator**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/tester`.
  2. Create a dedicated development-only Steam-linked QA submission/campaign using the fixture instructions below; submit your own QA report normally.
  3. Renew Allow optional analytics after reading the new purpose, then activate View Steam Page once.
  4. In a separate admin profile open Steam referrals, check the correct title/count and Top 10/25/50/All.
  5. Reject analytics and click again; confirm store still opens and total does not increase.
- **Expected result:** One recorded qualifying click; refusal/withdrawal does not block navigation or create a new event; no other links count.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Remove only exact dedicated QA event IDs through an authorised development operator if available; otherwise allow 90-day expiry. Preserve reports, XP and audit history.

### M26-PC-M01 — PC manual acceptance

- **Test ID:** M26-PC-M01
- **Feature area:** PC manual acceptance
- **Priority:** High
- **Test type:** Manual
- **Required role:** Signed-in account owner and developer
- **Preconditions:** Localhost connected to development; role: **Signed-in account owner and developer**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/account#pc-specifications`.
  2. Save optional model names and RAM, collapse/reopen and navigate away with an unsaved edit.
  3. Clear after confirmation; verify private values never appear on public profiles.
  4. Edit a dedicated game minimum/recommended field, save and compare in Tester Hub beside your own private specs.
- **Expected result:** Optional fields preserve edits and show manual comparison only; public game specs do not include private account values.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Restore original game fields and clear only your QA account specs.

### M26-RS-M01 — Reservation manual acceptance

- **Test ID:** M26-RS-M01
- **Feature area:** Reservation manual acceptance
- **Priority:** High
- **Test type:** Manual
- **Required role:** Tester with no active reservation
- **Preconditions:** Localhost connected to development; role: **Tester with no active reservation**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/tester`.
  2. Claim a free dedicated QA place.
  3. Check the displayed deadline and compare with server-issued timestamps.
  4. Release only your dedicated test; use tests/test-merge26-48-hours.mjs for controlled expiry rather than waiting.
- **Expected result:** New reservation is 48 hours; previously issued reservation is not shortened.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Release only your own QA reservation; no real deadline editing.

### M26-NT-M01 — Approval manual acceptance

- **Test ID:** M26-NT-M01
- **Feature area:** Approval manual acceptance
- **Priority:** High
- **Test type:** Manual
- **Required role:** Tester, administrator, owning developer in separate profiles
- **Preconditions:** Localhost connected to development; role: **Tester, administrator, owning developer in separate profiles**. Use separate browser profiles for different accounts.
- **Test data:** QA games A/B and dedicated development accounts described above; create only clearly labelled disposable submissions where instructed. Controlled time/rank states use the named disposable test runner, never genuine records.
- **Steps:**
  1. Open `http://localhost:3000/tester`.
  2. Submit a dedicated QA report.
  3. Accept it as administrator with a reason.
  4. Leave the owning developer bell closed in a visible tab and wait up to 15 seconds plus network latency; open its new alert.
- **Expected result:** Exactly one owner notification opens the correct workspace/build; another developer receives none.
- **Security/privacy expectation:** Use only authorised development accounts; do not expose credentials or unrelated users, send marketing, alter genuine history, or operate on production.
- **Actual result:** Not executed as owner manual acceptance; record observations here when performed.
- **Status:** Not Run
- **Evidence:** Owner to add timestamp, observed result and redacted screenshot/log reference; no password or private account mapping.
- **Cleanup:** Keep intended QA report/audit; mark the QA alert read if desired.

## MY MANUAL LOCALHOST ACCEPTANCE WALKTHROUGH

1. **Environment / signed out:** Open localhost, verify the Network Supabase hostname is development (MN-001). A production hostname or unexpected authenticated account is a stop condition. No time manipulation.
2. **Visitor:** On Home, exercise Featured, filters, pagination and other sorts (MN-012). Failure is inconsistent tier/filter order or missing genuine games. No writes.
3. **Owner developer:** Open My submissions for QA A; save a harmless edit, test failed-save Offline once, restore the value (MN-013/014). Expect one confirmed toast/top navigation; failure must retain edits.
4. **Owner + visitor:** Archive QA A, check public hiding/private history, restore (MN-015). Create/delete a fresh disposable unreviewed submission (MN-016); historical/approved hard deletion must refuse.
5. **Admin:** Open Admin Review, select QA A, toggle Admin Test/Demo, verify ordinary/public exclusion and private access, then clear it (MN-017). Check review ordering and legitimate reassessment (MN-018/019); do not clear existing unrelated work.
6. **QA tester → admin → developer → visitor:** Submit a dedicated QA report, moderate with a reason, inspect owner-only notification and accepted public number/current rank (MN-002/003/004/020). Requires accepted QA reports for label comparison; never adjust real XP just to force promotion. Controlled rank tests are automated ID-003/004.
7. **Admin:** Expand Tester Analytics, inspect definitions and all rank tiers (MN-005), then verify an ordinary account is denied (MN-006). Empty and malformed-data boundaries are supplied by the disposable analytics suite.
8. **Two QA testers:** Opt into a full QA campaign, release only the other tester’s dedicated reservation, click the single bell and cancel the request (MN-007/008/009). If safe full fixtures are unavailable, run the development release-browser test, which creates and cleans only its own synthetic holders. Never release another person’s reservation.
9. **Operator:** Run the expiry/concurrency fixture commands (MN-010/011). These simulate past deadlines in disposable databases and require **no 48-hour real wait**. The real development cron job was separately checked as active/succeeded.
10. **Visitor + admin:** Test analytics decline/allow/withdraw and inspect source versus voluntary discovery text (MN-021/022). Unknown is legitimate; no registration conversion is implied.
11. **All relevant roles:** Use keyboard controls, an unsaved disclosure input, 150% browser zoom/mobile, thumbnail-return flow, Narrator and reduced motion (MN-023–026). Failure includes lost unsaved input, inaccessible focus/state, accidental neighbouring action or page-wide overflow.
12. **Owner/legal:** Complete the privacy/retention/notice decisions, manual observations and future release gates (MN-027/028). No production migration, merge or deployment is authorised by this walkthrough.

## Operational release checks and remaining gates

- All migrations and development application status are listed in `MERGE-26-RELEASE-NOTES.md`. Production schema comparison/backup/restore readiness and explicit deployment authorisation are pending future release work, not executed tests.
- Scheduler: development job `merge26-tester-availability`, every minute; deployment must configure and verify this separately in production. No new app environment variables. Missing scheduler means delayed/missing expiry alerts even though reservation deadlines/capacity remain server-enforced.
- Rollback must preserve public-number allocation/tombstones and historical records. Do not reset identity sequences or drop genuine feedback data. See release notes.
- Legal/DPIA/LIA/retention/processor decisions are documented in the privacy review. No technical test can approve them.

## STEAM REFERRALS - MY MANUAL LOCALHOST ACCEPTANCE TESTS

Status: **Not Run** by owner. Browser automation uses mocked destinations; an actual Steam page load is not measured or claimed by analytics.

### Safe development fixture setup

1. Open http://localhost:3000 and verify browser Network uses development ktifgybnkdaotdxrvjgq.supabase.co. Stop if it points to production.
2. Use separate existing development tester, owning developer, unrelated developer and administrator browser profiles. Never put their passwords in this document.
3. As developer create a clearly labelled [DEV QA M26 STEAM] submission using your authorised game/build, actual developer name, one genuine thumbnail and a Steam URL copied from that game's real store page. Do not guess an app ID or use a title-generated URL. If no authorised Steam-linked QA game exists, this manual fixture is Blocked until one is available; the disposable SQL/browser suites remain usable without inventing a public listing.
4. Approve only this intended development fixture as administrator and publish a small QA campaign with safe authorised access. A tester claims and submits their own report normally. Admin accepts with a reason if testing reviewed history. Developer marks useful or not useful using the existing control; retain the original moderation audit. Use a second intentional QA report or change your own QA assessment to inspect all three states. Do not delete genuine submitted feedback to reset a fixture.

### Numbered acceptance actions

1. Starting at http://localhost:3000, click Login and sign in with the dedicated development tester.
2. Open Tester Hub, then scroll to Testing activity (not Available games).
3. Find your QA report; verify the genuine thumbnail, title, developer, Submitted timestamp, admin outcome, XP and three-state usefulness. Expand submitted feedback and XP/review history; verify reconsideration remains where eligible.
4. In the footer open Privacy & optional analytics. Read the new referral purpose and press Allow optional analytics again. An older general Allow alone is deliberately insufficient.
5. Note the admin total in a separate admin profile, then as tester activate View Steam Page once. Confirm the expected Steam destination opens in a new tab and Tester Hub state remains intact. The successful external load itself is not something Playtested can confirm.
6. In the separate profile log in as development administrator and open /admin/analytics or Admin Review.
7. Expand Steam referrals. Expect the correct game's count and total to increase by one after refresh/reopening the page. No tester identity should be displayed. A second deliberate activation may add another event.
8. Select Top 10, Top 25, Top 50 and All. Check descending count order, deterministic ties and Showing X of Y games. Overview totals must not change merely because Results changes. With fewer than the limit, only available games are shown. Do not manufacture large hosted datasets: use tests/test-merge26-steam-browser.mjs for 142 mocked aggregate games and SQL fixtures for tie/count boundaries.
9. Collapse/reopen the section; the selected Results value should remain. Other admin UI state must not reset.
10. Return to the tester footer, press Reject optional analytics and activate Steam again. Steam still opens; after refreshing the admin metrics the count must remain unchanged. Also test a fresh profile with no permission and withdrawal after renewed Allow.
11. Visit catalogue/game-details Steam links and a legitimate itch.io link: none adds to these Steam totals. Admin clicks are excluded even if the admin also has tester role.
12. For missing links use a QA game without a storefront: no store control should appear. Archive your own dedicated QA game through the existing owner control, reopen its tester history and check safe retained artwork/store link; signed-out visitors must not gain archive access. Restore only the QA listing afterwards. If a historical image is unavailable, expect Artwork unavailable rather than fabricated art.
13. Use keyboard only, then 390px mobile emulation and actual browser toolbar zoom 150%. Cards stack, thumbnail ratios remain intact, controls are readable and the All list scrolls inside its panel. Return zoom to 100% afterwards.

### Cleanup and evidence

Record actual observations, timestamp, role, test IDs and redacted screenshots against the matching cases; never mark these steps Passed without performing them. Restore QA listing controls/metadata, cancel your own availability requests and release your own unused reservations. Retain intended submitted reports/moderation audit. Do not hard-delete an account with report dependencies. The optional event table has no account/report IDs, so do not attempt to find or erase a person's past clicks by account. Dedicated test event UUIDs, if captured from your own Network requests, can be removed by an authorised development operator using exact IDs only; otherwise normal 90-day retention applies. Do not alter unrelated analytics or production.


# Merge 26 owner acceptance ledger - 5 November 2026

This ledger preserves the owner's reported results from the acceptance/finalisation briefs. It is separate from automated execution. Exact execution timestamps/screenshots were not supplied; do not invent them. Earlier formal manual cases may cover broader steps and therefore remain pending even where one workflow below was owner-verified.

| ID | Owner-reported workflow | Status | Evidence / limits |
|---|---|---|---|
| OWNER-01 | Account PC open/save/edit/clear/persistence and basic privacy | Passed | Owner acceptance brief; new searchable selector UX still needs owner retest. |
| OWNER-02 | Developer optional requirements entry/editing; public and Tester Hub display | Passed | Owner acceptance brief; preserved styling commits 2bcf39a/7a6ff00; selector retest pending. |
| OWNER-03 | Steam consent/click/admin reporting and Top 10/25/50/All | Passed | Owner acceptance brief; refusal/navigation without tracking was not completed. |
| OWNER-04 | 48-hour claim, one-active restriction, release and availability notification | Passed | Owner acceptance brief; no issued deadlines changed in this finalisation. |
| OWNER-05 | Admin ranks and Tester Analytics | Passed | Owner acceptance brief. |
| OWNER-06 | General catalogue/developer regressions, responsive UI and development fixture cleanup | Passed | Owner acceptance brief; not a claim that every later manual accessibility case was run. |
| OWNER-07 | Free one launch/rolling 30 days; Pro five/rolling 30 days and 48-hour gap | Passed | Latest finalisation brief; development policy independently read as 1/5 with existing entitlement flags. Checkout still expected 15; corrected to 5. The stated earlier fix was not assumed present: the actual checked-out parser still expected 15. No reset/cherry-pick overwrote newer work. |
| OWNER-08 | QA accepted report quality/XP and immediate developer approval notification | Passed | Latest brief supersedes the earlier rubric blocker; accepted report 1c6c3bc7-eca4-490c-bd50-ea9b402f960d. |
| OWNER-09 | QA rejection with reason; no developer notification | Passed | Latest brief; rejected report 423d0044-6664-4561-b842-c3530ab9b739. |
| OWNER-10 | Historical artwork, usefulness states and submitted feedback history | Not Run | Previously blocked/incomplete owner walkthrough. Automated authenticated history/artwork checks now exist; owner retest remains. |
| OWNER-11 | Notification bell deep link, correct build, Back/Forward and no duplicate | Not Run | Notification generation passed separately. New real authenticated automated test covers click/direct URL/navigation and preserves state. |
| OWNER-12 | Steam refusal/withdrawal with ordinary navigation and unchanged counts | Not Run | Mocked browser/server consent tests passed; owner manual refusal remains. |
| OWNER-13 | Useful/not useful/unrated independent of admin outcome/XP | Not Run | Shared badge tests passed; owner-specific assessment walkthrough remains. |
| OWNER-14 | New hardware selectors, three-place QA/default display and actual 150% toolbar/screen-reader acceptance | Not Run | Focused automation provided; owner acceptance still needed. |

The earlier Admin Review quality-rubric blocker is **resolved by the owner's later successful approval/rejection evidence**, independently confirmed by the actual authenticated admin rubric RPC and QA queue in the new integration test. Its historical root cause cannot be reconstructed from a currently healthy RPC; no claim that rerunning migration 013 was necessary is made. The UI now offers a targeted retry with an accurate configuration/access message rather than instructing an unsafe blind migration replay. No current technical blocker is inferred from the old message.

## MERGE 26 — REMAINING LOCALHOST ACCEPTANCE WALKTHROUGH

Environment: http://localhost:3000; only ktifgybnkdaotdxrvjgq. Required roles: existing development administrator/developer 64acc8c1-c78d-47b8-b1d7-4fd9ac6e89d9, the two dedicated QA testers, and an unrelated ordinary account. The named developer also has legitimate admin access, so use an ordinary tester for denial checks. Use established local development logins; never reset a real password or paste session tokens. If interactive synthetic credentials are unavailable, leave that owner step pending and use the authenticated automation; do not invent a manual pass.

Safe existing campaign: 41a91bb0-6439-423f-ab59-fc1defbe0ec8 (Playtest 002). Retain its accepted/rejected report IDs above and their audits. No new hosted reports are required for this walkthrough.

1. **Admin Review error retest:** Sign in as admin, open /admin/submissions?tab=playtests, then Reviewed. Find DEV QA cards. Confirm the rubric loads and the stale migration-013 warning is absent. Open an Awaiting review card only if there is a genuinely dedicated new QA report; assess originality/relevance and preview 0-100 XP without submitting a decision just to reset an already-reviewed record. Approval/rejection generation is already owner-passed; do not re-moderate these historical fixtures unnecessarily. On a temporary offline failure, Retry rubric should recover after restoring network without losing the assessment inputs.
2. **History/artwork:** As each report's tester open /tester, Testing activity. Compare title/developer, real thumbnail, Submitted date, Accepted/Not accepted, actual quality and XP. Expand View my submitted feedback and XP & review history; inspect reasons/dates and signed XP deltas. Collapse/reopen. Legacy missing awards say Not recorded rather than an invented zero. For partial awards/reversals/reconsideration, use an existing dedicated QA history or the disposable graded-quality test; do not rewrite genuine history to create a screenshot.
3. **Usefulness:** As owner use the existing feedback usefulness control on the accepted QA report, checking useful and not useful as appropriate; inspect Admin Review and Tester Hub. A report without an assessment stays neutral. Confirm XP and admin decision do not change. If changing the QA assessment, record the intentional final value; do not delete its audit/notifications to hide the test.
4. **Notification deep link:** As developer start on another page, open the bell and select New playtest feedback approved for Playtest 002. Expect the correct My Games selection, campaign and Individual responses tab, with the feedback section scrolled into view. Open the accepted report's existing disclosure to read its full answers. Back returns naturally; directly paste the existing notification URL in a new tab and repeat. Reopening never generates another notification or XP award. Also try an ordinary unrelated account: private developer RPCs must reject access. If the alert has aged out of the bell's eight recent entries, use notification history/direct URL and record the bell step pending rather than fabricating a new alert.
5. **Capacity:** Open the QA playtest configuration. Expect three saved Tester Hub places; two submitted reports occupy two places and leave one unless another legitimate reservation has since been made. Compare Tester Hub/Refresh places and admin data. New drafts also default to three. Other existing campaigns retain their intentionally saved capacities; do not globally convert old rounds. Never reduce below occupied/submitted places.
6. **Entitlements:** With an ordinary Free developer creating an unpublished draft, Bronze/all ranks is selectable; Silver/Gold/Platinum and required genre match are visible as Locked and disabled. Existing published rounds may keep/lower their prior restrictions but cannot strengthen them after downgrade. With a dedicated administrator-authorised Pro fixture, higher targeting is enabled. Do not grant paid entitlements to real accounts solely for this retest; mocked plan-browser and disposable plan-policy tests cover both states.
7. **Hardware:** In Account choose a CPU by manufacturer/model search. Search GPU using RTX4070TI, 4070 ti and NVIDIA 4070 Ti; choose the same canonical model each time. Test arrows/Enter/Escape and Other / Not listed with a bounded unusual model. Save/reload and clear. Repeat minimum/recommended in Submit/Edit listing. Existing unknown strings must remain custom; public game labels must not show private account hardware or claim compatibility. Collapse/reopen preserves selected values. Restore only your own temporary QA specs/requirements afterwards.
8. **Steam refusal:** Use the already-authorised Steam-linked game/history from the earlier owner test. The QA campaign may not have a valid Steam destination: do not guess one or relabel itch.io. As an ordinary tester note admin totals, Reject optional analytics and activate View Steam Page. Steam opens in a new tab, original Hub state remains, and a fresh admin report does not gain a click. Renew Allow for this new purpose and make one intentional activation; expect one recorded click. Reject again. Admin/itch/catalogue links are excluded. Record missing-link cases honestly.
9. **150% / mobile / accessibility:** Use actual browser toolbar zoom 150%, then mobile 390px. Check history cards, event disclosures, hardware list scrolling and section controls. Long reasons wrap; no document-wide horizontal overflow. Use Tab and a screen reader for label/expanded-state announcement. CSS zoom automation is evidence for layout, not owner screen-reader acceptance. Reset zoom afterwards.

Cleanup: restore only changed QA specs/assessment choices if appropriate, release only your own unused reservations, and leave both reports, XP, ranks, dedupe keys, notifications and audit events intact. No feedback/account deletion is appropriate while these fixtures are needed for regression/screenshot/deep-link acceptance. The guarded development-only capacity script is **not** a report-cleanup script or production migration. Any future removal needs separate reviewed dependency/XP-reversal/dedupe/trigger handling; do not hard-delete reports or their auth accounts. Production/privacy approvals remain separate release gates.
