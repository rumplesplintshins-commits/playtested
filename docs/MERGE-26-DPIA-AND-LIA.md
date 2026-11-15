# Merge 26 — Data Protection Impact Assessment and Legitimate Interests Assessment
**Assessment date:** 5 November 2026
**Status:** Owner design decision recorded (ranks only); revised implementation and accountable controller review outstanding
**Scope:** Merge 26 Playtested changes, especially stable public tester numbers and current ranks on accepted public feedback. This document is not a legal compliance certificate.

## Owner decision — 5 November 2026: ranks only; no public permanent tester numbers

The owner has expressly rejected the proposed persistent public tester-number design. **Approved product direction:** public feedback may display the tester's current rank, but must not display a permanent public tester number or expose any stable cross-game tester identifier, profile link or other equivalent correlator. Internal tester UUIDs remain private for authenticated ownership, moderation, eligibility and XP. The existing database design and public resolver must be changed and verified before production deployment; this decision does **not** approve the current code as safe.

**Updated LIA:** the original legitimate-interest claim for public cross-game tester numbers is withdrawn. No LIA justification is sought for publishing such numbers because that processing is out of scope. Showing a current rank on eligible accepted feedback supports credibility and recognition with less linkage, but the rank and free-text feedback can still be personal data. Assess reasonable expectations, fairness, user objection, moderation and whether rank-only display is proportionate. Where appropriate, rely on the service basis for requested feedback delivery, and assess legitimate interests separately for public rank publication; do not assume terms acceptance establishes the basis.

**Updated DPIA risk:** deliberate persistent cross-game identifier linkage is removed from the design, reducing re-identification and harassment risk. Residual risks remain from report content, rank rarity, timestamps, game association, existing names or links, screenshots, and developer/private moderation views. Confirm that public pages/API payloads do not leak private tester UUIDs, numeric identity, deterministic stable labels, or profile links. Do not merely hide a number with CSS.

**Existing-user handling:** do not retrospectively publish new rank labels on existing accepted feedback without updated transparent notice and a reviewed objection/restriction route. The owner must decide notice timing and whether rank-only publication applies to historical accepted reports.

**Data minimisation:** avoid allocating public numbers for new testers. Do not delete or reassign any existing mapping without a reviewed migration and data-retention assessment; restrict its grants and public use. Existing admin rights-restriction controls should hide public rank when requested. Internal moderation and XP history must remain intact.

**Release gate:** remove public-number display and API exposure, update privacy and terms wording, revise tests and the admin restriction runbook, validate RLS and server-side resolver output in development, then perform release checks. This document records a product decision, not final controller approval or a signed DPIA.

## 1. Processing and context
Playtested is an individual-operated UK-facing indie-game testing platform. It processes account/profile data, submissions, claims/reservations, feedback, XP/ranks, developer contacts, optional PC specifications, opt-in analytics/Steam clicks, and operational notifications. Production Supabase primary region is Ireland. Other processor, control-plane and support locations need verification.

**Owner-approved product design:** eligible accepted public feedback can show a **current tester rank only**. No permanent public tester number, stable tester profile identifier or cross-game history link is permitted. Internal ownership UUIDs remain private. Feedback text, rare ranks, timestamps and game associations may still enable inference or re-identification; ranks-only is not anonymity.

Audience intended 18+, with a declaration for new registrations; legacy users and actual audience require confirmation. Small current user numbers do not eliminate risk.

## 2. Necessity and proportionality
Purpose: help readers contextualise feedback and recognise tester experience without creating a permanent public cross-game identity. A current rank is less intrusive than a persistent number. Alternatives include showing no rank or showing rank only to the report author/developer. The operator must document why public rank is proportionate and expected, especially on historical reports.

Minimisation: server-authorised accepted-public-only rank resolution, no public UUID/number/handle/profile link, no rank history endpoint, no private PC/email data, and admin rights restriction that suppresses public rank. Do not expose hidden identifiers in API payloads or HTML.

## 3. Legitimate interests assessment
**Purpose:** credible feedback and recognising tester experience may benefit readers, testers and developers.
**Necessity:** public rank can support that interest with less identification than persistent numbers. Its necessity compared with no public rank is still a controller judgement.
**Balancing:** rank plus feedback may reveal information about a tester; older contributors may not expect retrospective public ranks. Existing safeguards include accepted-only gating, no stable public identity, admin restriction, RLS and support objection route. Give clear advance notice and consider historical feedback defaults before publication.
**Outcome:** stable public tester numbers **rejected**; their proposed LIA is withdrawn. Public rank processing remains **conditionally assessed, not approved** until controller documents expectations, historic handling, lawful basis, objection response and residual risks. Optional page analytics and Steam clicks require separate independent opt-ins, default off.

## 4. Risks and safeguards
| Risk | Severity before safeguards | Safeguards and residual action |
|---|---|---|
| Stable cross-game linkage | High | Permanent public number and mapping removed from planned schema/UI; verify no equivalent identifier leaks in public responses. |
| Re-identification via rank/report text | Medium to high context-dependent | Accepted-only display, no profile links, moderation and rights restriction; review rare-rank and free-text exposure. |
| Surprise publication of historical rank | Medium | Advance notice, objection route and owner decision on historical reports required. |
| Rank-based eligibility/exclusion | Medium | Human reconsideration route; assess practical effect of exclusion. |
| Children/legacy age status | Medium/high uncertain | New-account 18+ declaration; assess actual and legacy users, avoid unnecessary identity collection. |
| Rights, erasure and retention | High | Admin restriction and partial minimisation; manual case-specific review for Auth, free text, files, backups and processor data. |
| Unauthorised private data disclosure | High | RLS and restricted RPC; run real SQL, API and browser checks before production. |
| Consent, processors and transfers | Medium | Separate analytics opt-ins; verify live settings, retention jobs, contracts, transfer safeguards and logs. |

## 5. Rights and operational procedure
Contact: support.playtested@gmail.com. The individual operator should verify requests proportionately, track deadlines and decisions, and apply interim public-rank restriction where appropriate. Existing minimisation RPC is **partial**, not full erasure; original reports, Auth data and free text can remain. Preserve justified evidence and review retained categories. Verify sessions when banning an account.

## 6. Consultation and transparency
Give existing testers accurate notice before showing rank on historical feedback; document consultation or reasoned alternative. Finalise privacy/terms notices and effective date. Controller public alias is N Quanja, but legal identity and required contact/address disclosure are unconfirmed; do not publish a residential address automatically. Verify account-level Supabase/Render/Google processor terms, transfer arrangements, logs, backups, retention and ICO registration/fee applicability.

## 7. DPIA conclusion and release conditions
**Risk reduction:** removing persistent public numbers substantially reduces intentional cross-game correlation. Remaining concerns include public rank with feedback text, expectations of historical users, automated eligibility, rights handling, age assurance and operational retention. The proportionate DPIA is drafted but **not signed off**.

**HOLD release until:** (1) rank-only code and migrations are regression tested; (2) public API/HTML cannot leak stable identities; (3) final notices, historical-user treatment and objection route are approved; (4) operator/provider/retention facts are documented; (5) backup recovery and production migration checks pass; and (6) accountable controller records final residual-risk decision. If high residual risk remains, seek appropriate specialist advice and consider regulator consultation.

**Evidence:** Merge 26 screening, owner decisions, rights runbook, ranks-only implementation contract and branch changes dated 5 November 2026. No full restore rehearsal, production migration or controller signature is asserted.
