# Playtested — private evidence local walkthrough (issue #66)

**Do not run against production.** Use isolated local Supabase / Postgres and local Next.js. No copies of real tester emails, report documents, recordings or production tokens in fixtures.

## Goal

Demonstrate the complete real-user journey on a disposable isolated environment: a **new developer signs up**, submits a **playable game**, obtains local admin approval, **configures and publishes a playtest**, and a **separate new tester** claims it and submits ordinary feedback plus optional document/video URLs. Admin reviews/accepts the feedback; the owning developer sees both links separately in My Games > Individual responses; unrelated developers and public pages cannot obtain them. The private-evidence migration and RPCs are implemented on this draft branch, but have **not passed the required full isolated Supabase/browser QA**. Neither the migration nor this walkthrough is approved for production.

## NEW — Developer signup, game setup and playtest publication (mandatory E2E action)

This extends the prior privacy checks. **Do not skip account creation or insert the game directly as an admin:** the point is to prove that normal developer registration and game submission work.

**Environment:** isolated local Supabase/Auth/Mailpit and a local Next.js server running PR #67. Use `http://localhost:3001` only if that is the actual app origin (otherwise substitute the real local port everywhere). Ensure that origin is allowed in the *local* Supabase email confirmation redirect settings before beginning. Do not use production Supabase credentials or real email addresses. On another device, `localhost` refers to that device, not this PC.

1. **Create the developer account in the UI.** Open `<APP_ORIGIN>/login?mode=signup&role=developer&next=/submit`, use a fresh local-only address such as `qa-dev-20261116@example.test` and a unique password, keep only **Game Developer** selected, confirm 18+, and select **Create account**. Capture the confirmation email via the isolated Mailpit inbox, follow the real callback, and verify the account is signed in. Verify `profiles.role = 'user'` and `profiles.roles` includes `developer` but not `admin`. Do not create an admin account via client-side role metadata.
2. **Submit a playable QA game through `/submit`.** Use these exact fixture values, changing only the origin/unique title suffix as needed:
   - **Game title:** `Neon Parcel QA — Local Only` (add a run suffix for repeated runs)
   - **Developer / studio:** `Playtested QA Studio (local)`
   - **Genre:** `Action`; **Release status:** `Not announced`
   - **Description:** `Local-only test listing for the Playtested signup-to-feedback walkthrough. Use the included Neon Courier demo to collect highlighted parcels and report any missed taps, unclear instructions, visual problems and usability issues. This is a fictional QA listing and must never appear in the live catalogue.`
   - **Platform:** `PC / Other`; **External game link:** `<APP_ORIGIN>/demo-games/neon-courier`. This platform permits local HTTP links in the isolated fixture. The **Browser** platform requires HTTPS, so use it only when the same demo has a valid *isolated HTTPS preview* URL.
   - **Game thumbnail:** upload a non-personal screenshot from the local demo (required; do not use a real developer's artwork or credentials)
   - **Overall AI involvement:** select `No AI used` **only if accurate for the chosen fixture**; otherwise select the accurate disclosure and explain it. Do not make a false AI declaration.
   - **Private contact, evidence link, gameplay footage, screenshots:** optional, leave empty unless specifically checking them.
   - Click **Submit application** and verify the saved record belongs to the new developer and shows **Pending Review** (or **Needs More Information** if deliberately testing an incomplete submission). Ensure it is not public/launchable before approval.
3. **Approve the listing using a separate authorised local admin account.** Verify the game is assigned to the actual developer and the admin can review it without changing the developer's role. Approve only this fictional local fixture; do not auto-approve live Beyond Realm or other pending feedback.
4. **Configure the playtest as the same developer.** Open `<APP_ORIGIN>/my-submissions`, choose **My games**, open the approved QA game and click **Start playtest**:
   - **How will testers access this build?** `Browser game` (this is the campaign access method and can point at the local demo even when the listing uses PC / Other)
   - **Tester access link:** `<APP_ORIGIN>/demo-games/neon-courier`
   - **Testing instructions:** `Play two short rounds. Collect highlighted parcels, try a few incorrect bays, then describe control clarity, visual feedback, bugs and one improvement. Do not include personal contact details or external document links in written feedback.`
   - **Focus areas:** select `Controls`, `UI / UX`, and `Bugs`
   - **Testing audience:** `Playtested testers`; use the normal tester availability/eligibility check and free-plan place allowance (no hard-coded override)
   - **Estimated test time:** `10` minutes; **Build / release label:** `Local Demo 0.1`
   - Choose **Save draft** first and verify the saved values survive a reload. Then **Publish playtest**. Verify it becomes open/claimable only when the normal eligibility, allowance, approval and publication requirements are met.
5. **Verify from a separate tester account.** Create/confirm a new **Tester** signup, sign in, find the QA campaign in `/tester`, open the actual demo, claim/start a place, and then perform the evidence/feedback sequence below. A developer-only account must not be able to claim a tester place merely by editing its role metadata.
6. **Record identifiers and clean up after QA.** Keep only synthetic account IDs, submission ID, campaign ID, test ID and pass/fail evidence in the local QA report. Remove the fictional accounts, game and campaign from the **isolated test environment** after recording results; do not alter production.

**Pass condition:** a fresh developer can register without elevated privileges, submit a genuinely playable game, receive local approval, publish a standard tester-facing campaign and later inspect the accepted private report links. Fail the E2E gate if any part only works through privileged direct DB inserts or by bypassing the regular UI.

## Test data

- The newly registered developer's fictional game `Neon Parcel QA — Local Only`, linked to the locally served playable `neon-courier` demo, with one approved listing and one published test round, explicit **Testing objectives** and three **Focus areas**.
- At least four isolated accounts: a new tester, a **newly signed-up** game-owning developer, unrelated developer and pre-authorised local admin. Never grant admin via signup roles.
- `overall=9, gameplay=7, performance=10, played=0.75h`; written strengths and a concrete improvement.
- **Fake** document URL `https://docs.google.com/document/d/LOCAL_FAKE_DOC_ID/edit` and recording URL `https://drive.google.com/file/d/LOCAL_FAKE_RECORDING_ID/view`. The links are deliberately not live media. Assert only link rendering and access control (no remote fetching).
- No name, email, phone, or original Curtis feedback content in fixtures.

## Workflow

1. Reset isolated local DB, apply all tracked migrations including private evidence migration, and verify Supabase points to localhost. Complete the developer signup, game submission, local admin approval, and campaign creation/publish action above **before** testing the tester-facing flow. Use real local Auth sessions rather than direct admin DB inserts for developer/tester accounts.
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
- [ ] New developer signs up and confirms locally, with correct roles and no privilege escalation
- [ ] Developer submits the playable QA listing through the UI; local admin reviews/approves it
- [ ] Developer saves and publishes a campaign under ordinary plan, eligibility and availability gates
- [ ] New tester can claim and play the demo, submit feedback, and developer can see accepted evidence only
- [ ] Browser QA desktop/mobile/150% zoom
- [ ] Backups and isolated restore successful
- [ ] All CI green
- [ ] Owner explicitly approves production migration/deployment

