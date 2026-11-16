# Playtested — private evidence local walkthrough (issue #66)

**Do not run against production.** Use isolated local Supabase / Postgres and local Next.js. No copies of real tester emails, report documents, recordings or production tokens in fixtures.

## Goal

Demonstrate that a brand-new tester can submit the ordinary feedback plus an optional supporting document and video recording, admin can review/accept, the owning developer sees both separately in My Games > Individual responses, and anonymous/unrelated users/public game-detail pages cannot obtain either. This test is **BLOCKED until private evidence migration and RPC contracts exist**. The initial draft branch only contains task-label clarity and a public download template; these are not sufficient for privacy release.

## Test data

- A fictitious game titled `Sample Realm — Local Privacy Fixture`, with one published test round, explicit **Testing objectives** and three **Focus areas**.
- Four isolated accounts: tester, game-owning developer, unrelated developer, admin.
- `overall=9, gameplay=7, performance=10, played=0.75h`; written strengths and a concrete improvement.
- **Fake** document URL `https://docs.google.com/document/d/LOCAL_FAKE_DOC_ID/edit` and recording URL `https://drive.google.com/file/d/LOCAL_FAKE_RECORDING_ID/view`. The links are deliberately not live media. Assert only link rendering and access control (no remote fetching).
- No name, email, phone, or original Curtis feedback content in fixtures.

## Workflow

1. Reset isolated local DB, apply all tracked migrations including private evidence migration. Verify Supabase instance points to localhost. Use a real test Supabase session where applicable.
2. Sign in as tester; claim/start the fixture test. Open the feedback form at 390px/mobile, desktop and 150% equivalent zoom. Confirm separate **Testing objectives** and **Focus areas** and clickable download for the optional report template. Confirm the document contains no individual's data.
3. Fill mandatory feedback and both optional evidence URLs. Save and reload the draft; ensure both URLs survive. Submit once. Verify one accepted test row and one private-evidence row, transactionally. A second submit must fail without duplicate data. Existing legacy clients with no evidence URLs must still submit.
4. As admin, verify the feedback and both evidence links appear separately and are labelled private. Approve / award XP. Verify written public feedback contains **no evidence URL, personal contacts or embedded file metadata**; if present, approval must fail with a clear safe action.
5. As game-owning developer, open My Games > Individual responses and confirm original written feedback plus separately labelled **Additional feedback document** and **Gameplay recording** links. Links must have `rel="noopener noreferrer"` and no auto-embed.
6. As unrelated developer, tester B and anonymous visitor, attempt each guessed evidence test ID by RPC / REST. Verify no evidence URL and no revealing existence details. Check direct table SELECT fails, public game detail/CommunityReception/public RPC/search engine metadata do not contain either URL.
7. Check the public game detail still shows approved anonymised feedback summary and gameplay ratings; it must **not show the evidence fields**, nor mention the private document/video. Confirm all tests are local.
8. Run existing XP, testing, role security, privacy and catalogue smoke tests. Perform visual mobile/desktop 150% reflow. Confirm draft/state, notifications and developer helpful votes still function.

## Curtis's live report

Current real Beyond Realm report remains **pending**. Do not seed his personal email or copy his Google Docs/Drive URLs to local test data. Later migrate the historical URL to an authorised private evidence record using an audited admin correction, preserving review history, only after all above tests pass and owner explicitly approves the production migration. Never auto-approve as part of deployment.

## Release gates

- [ ] Private-evidence schema and per-role grants/RLS verified
- [ ] API/RPC no-leak tests for all public readers
- [ ] Admin migration/redaction path and audit
- [ ] Existing and new client submission verified
- [ ] Developer-only display verified
- [ ] Browser QA desktop/mobile/150% zoom
- [ ] Backups and isolated restore successful
- [ ] All CI green
- [ ] Owner explicitly approves production migration/deployment

