# Merge 26 — Data Protection Impact Assessment and Legitimate Interests Assessment
**Assessment date:** 5 November 2026
**Status:** Draft assessment completed; accountable controller review and release sign-off outstanding
**Scope:** Merge 26 Playtested changes, especially stable public tester numbers and current ranks on accepted public feedback. This document is not a legal compliance certificate.

## 1. Processing and context
Playtested is an individual-operated UK-facing indie-game testing platform. It processes authentication/profile data, game submissions, claims/reservations, feedback, scores/XP/ranks, developer contacts, optional PC specifications, optional page analytics and Steam-referral clicks, and operational notifications. Supabase hosts production database/auth/storage in Ireland; Render application service is in Frankfurt based on connected service metadata. Other control-plane, support, logging and subprocessor locations are not established.

The new high-impact processing is a **persistent tester number** and **current rank** exposed with eligible accepted public feedback. The same number across games enables readers to connect contributions. The underlying UUID-to-number mapping is personal data; a pseudonym is not anonymity. No email, private UUID, PC specifications, or pending/rejected feedback is intended to be public via this feature.

Audience is intended 18+ with a new-registration declaration, not verified age assurance. Existing/legacy account age status and actual audience require owner assessment. Current production size observed 5 November: 46 Auth accounts, 89 submissions, 17 playtest campaigns, 195,362 imported Steam listings. These counts are not a forecast or evidence of absence of risk.

## 2. Necessity and proportionality
Purpose: recognise credible testers, support readers' interpretation of feedback, and discourage low-quality or duplicate contributions. Stable attribution may improve reputation and accountability but is **not essential** for game testing or feedback collection. Less intrusive options include game-specific pseudonyms, non-linkable badges, showing rank only without a persistent number, or displaying no attribution. The operator should document why these alternatives fail to meet the chosen purpose before approving stable cross-game attribution.

Data minimisation: accepted-public-only resolution; private RLS mapping; no email/private account ID/PC details; no public tester profile/history endpoint. Current rank can change after the report was written, so notices must not imply historical rank.

## 3. Lawful-basis assessment (LIA)
**Purpose test:** Legitimate interest proposed in credible feedback and recognition, benefiting developers, testers and platform integrity. Commercial convenience alone does not settle necessity.
**Necessity test:** Not conclusively passed: game-scoped pseudonyms or non-linkable badges may achieve much of the benefit with less cross-game correlation. Owner must record evidence for choosing persistent identifiers.
**Balancing test:** Reasonable tester expectations are uncertain, especially for existing users who contributed before persistent public numbers were introduced. Linking reports across games can expose patterns, encourage unwanted contact, or aid re-identification when comments reference external identities. Safeguards reduce but do not eliminate those effects. A meaningful advance notice, easy objection/restriction route, prompt response and no retrospective surprise publication are recommended. Do not treat acceptance of general terms as automatic agreement to this legitimate-interest processing.
**LIA decision:** CONDITIONAL / NOT YET APPROVED. Do not activate persistent public attribution until necessity, expectations and balancing are documented and owner approves the conclusion. If legitimate interests cannot be justified, choose the less intrusive design or establish another valid lawful basis before processing.

Other processing: requested account/service features may use contract where objectively necessary; proportionate security/moderation may rely on legitimate interests subject to balancing; optional page analytics and Steam click measurement are separate opt-ins, off by default, independently withdrawable. Developer optional contact preference is separate from essential service contact. Legal bases must be documented by purpose, not applied indiscriminately.

## 4. Risk evaluation and controls
| Risk | Initial assessment | Existing controls | Residual assessment / action |
|---|---|---|---|
| Cross-game linkage, re-identification or harassment | High impact possible | Accepted-only resolver; private mapping/RLS; admin can hide both number and rank; audit | **Material until necessity/notice/objection handling approved.** Copies and screenshots cannot be recalled. |
| Unexpected publication of existing testers' history | High | Restriction RPC | **Material:** notify existing testers before public activation; assess default-off/grandfathering or non-linkable alternatives. |
| Private data disclosure through RPC/joins | High | Admin-only resolver paths, security-definer restrictions, RLS, development tests | Medium conditional on production permission verification and post-deploy testing. |
| Unfair rank-based eligibility/exclusion | Medium | Human feedback review, support/challenge route | Review real-world effect of exclusion and provide meaningful human reconsideration. |
| Children or vulnerable users | Medium/high depending on actual audience | 18+ declaration for new accounts | Legacy/actual audience and handling of known under-18 accounts must be confirmed. |
| Ineffective deletion/objection | High | Admin restriction and partial minimisation RPC; rights runbook | **Material:** no universal erasure; Auth, reports/free text, backups, provider records need case-by-case treatment and deadlines. |
| Optional analytics without meaningful permission | Medium | Independent default-off choices, withdrawal, expiry, privacy-signal handling | Check production UI, consent version and server retention job. Browser-local evidence is not a durable central receipt. |
| Excessive retention or cross-border processing | Medium/high | 30-day waiting requests; 90-day new availability alerts; 90-day analytics | Provider retention, audit/report/support/backup schedule, transfer mechanisms and operational jobs must be confirmed. |

## 5. Rights and operational procedure
Privacy contact currently proposed: support.playtested@gmail.com. Assign the individual operator to receive, verify proportionately, track and answer access, correction, objection, restriction and erasure requests. The existing runbook supports immediate public attribution restriction and later partial minimisation with an audited admin RPC; this does **not** erase Auth identifiers, original feedback, XP, free text, all files or external copies. Record category-by-category decisions and review dates. Assess relevant statutory response times; do not promise instant deletion. Verify token/session handling before treating an account ban as effective.

## 6. Consultation, transparency and processors
Consult representative existing testers about whether they reasonably expect their feedback to be linkable across games, or document why direct consultation is impracticable and alternative evidence used. Provide advance plain-language notice and accessible objection route. Privacy/terms pages currently marked draft/noindex must be finalised, dated and published before relevant processing.

Controller: individual operator, public alias N Quanja. Legal identity, suitable contact/address disclosure and effective date are **unconfirmed**; do not present alias as verified legal name or automatically publish a residential address. Verify applicable Supabase, Render and Google/Gmail processor agreements, subprocessors, transfer safeguards, support/control-plane regions, logs and retention. Check ICO registration/fee applicability, processing records and incident response obligations.

## 7. DPIA conclusion and release gates
Screening identifies multiple DPIA criteria: scoring, systematic public linkage, potential re-identification, and rights/age risks. A proportionate DPIA is justified. The technical controls are a meaningful starting point, but residual risk from persistent cross-game linkage and unexpected retrospective attribution is not yet demonstrated acceptable. If high risk cannot be reduced sufficiently, obtain appropriate specialist advice and consider whether supervisory-authority consultation is required before processing.

**Decision: HOLD PUBLIC ATTRIBUTION PENDING ACCOUNTABLE APPROVAL.** Do not represent this document as a signed DPIA, passed LIA or permission to deploy. Other Merge 26 functionality can be released only after independent deployment compatibility, backup/recovery, notices and operational controls are checked.

### Required accountable decisions (owner to record with date)
1. Confirm legal controller identity and compliant service/contact disclosures, without automatically publishing a home address.
2. Explain why stable cross-game numbers are necessary rather than game-scoped or non-linkable alternatives; approve or reject the LIA balancing test.
3. Decide treatment of pre-existing tester feedback and advance notice/objection period.
4. Confirm 18+ actual audience, legacy handling, exclusion consequences and appeals.
5. Approve a retention schedule for reports, audits, support emails, logs and backups; assign rights operator.
6. Verify account-level provider terms, transfer safeguards and actual retention/log settings.
7. Accept or reject remaining risks, record DPIA reviewer, date and whether consultation is needed.

**Evidence:** docs/MERGE-26-DPIA-SCREENING.md; docs/MERGE-26-OWNER-PRIVACY-DECISIONS.md; docs/MERGE-26-RIGHTS-RUNBOOK.md; read-only production schema and counts 5 November 2026. No production migration, personal-data publication, full backup restore or owner sign-off was performed in producing this assessment.
