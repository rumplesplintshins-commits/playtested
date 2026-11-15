# Merge 26 DPIA screening — technical assessment complete, owner review required

Date: 5 November 2026. Controller public-facing alias: N Quanja, individual operator. Legal identity/address remain unconfirmed. This screening records evidence and unknowns; it is not a signed full DPIA, lawful-basis approval or assurance of legal compliance.

## Processing and necessity

Service processing covers accounts, game submissions, private optional model-level PC data, reservations, feedback moderation/XP and requested availability notifications. Persistent tester numbers and current ranks can appear on accepted eligible feedback across games. Page analytics and Steam click measurement are separate optional purposes, default off, with independent choices and browser-local version/scope/decision-time evidence. Steam events have no tester/report/session/device identifier. Purpose limitation prohibits marketing/profiling reuse. Planned waiting/alert retention is 30/90 days; analytics90 days. Other retained reports, audit records, provider logs and backups require a category-specific owner schedule.

Public numbers help recognise contributions without publishing account identity, but an alternative such as game-scoped pseudonyms would reduce correlation. Keeping persistent public numbers is the owner's selected design; the necessity/balancing justification for this additional linkage must be recorded, not assumed from developer convenience. Private UUID/report mapping remains personal information, not anonymisation.

## Screening criteria

| Criterion | Evidence / assessment |
|---|---|
| Evaluation/scoring | Present: XP/ranks and automated campaign eligibility; quality moderation is human and challenge route exists. Whether exclusion has a similarly significant effect needs owner context; free access alone does not settle it. |
| Systematic monitoring | Intentional aggregate optional analytics is bounded and not advertising surveillance. Persistent public contributions enable longitudinal observation by other readers; assess together with scoring. |
| Combining/linking data | Present: public number connects accepted reports across games and may be linked with external posts or disclosed identities. No cross-service matching implementation exists. |
| Sensitive/highly personal information | Not requested, but report/support free text and screenshots can contain incidental personal/sensitive material. Private hardware model details are not serial numbers or automatic device detection. |
| Vulnerable people/children | Intended and advertised audience18+; new registration requires declaration. That is not verified age or proof children cannot access a public gaming site. Legacy age assurance, actual access likelihood and response to known under18 users need owner assessment. Do not introduce intrusive ID collection as a shortcut. |
| Large scale | Read-only snapshot44profiles/40reports/32accepted does not demonstrate planned scale or all Auth users. Forecast/retention reach remains an owner input. |
| Automated significant decisions | Not established. Rank/eligibility can deny campaign access; assess practical consequences, meaningful human review and contestability. No blanket Article22 exemption claimed. |
| Novel/invasive technology | No fingerprinting, automatic hardware inspection, biometrics, ads SDK or hidden third-party players. Common web components do not eliminate combination risks. |
| Exclusion/rights impediments | Present operational risk: genuine-report Auth deletion conflicts with protected historical FKs/guards. Tested masking/minimisation is available; complete erasure still needs case-specific handling. |
| Transfers/processors | Supabase primary region Ireland verified. Applicable contracts, Render region, support/control-plane transfers and actual retention remain unverified account facts. |

## Risk register and controls

| Risk | Initial concern | Implemented mitigation / residual question |
|---|---|---|
| Cross-game correlation, unwanted identification/harassment | High impact possible | Accepted-only resolver; no email/private UUID/PC exposure; admin-audited cross-game number AND rank restriction. Public copies/screenshots and other report content remain outside automatic recall. LIA/notice and handling readiness required. |
| Analytics collected beyond permission | Moderate/high trust impact | Independent opt-ins, old choices invalidated, versioned scope/time, withdrawal and expiry, privacy-signal checks, no tracking redirect. Browser-local evidence is lost on clear; no server receipt/identity ledger is asserted. |
| Excessive retention/ineffective erasure | High impact possible |30day request expiry/90day new alerts; verified dev worker; production worker still absent. Tested partial minimisation does not erase Auth/free text; manual inventory and response process mandatory. |
| Account misuse or access to private mapping | High impact | RLS, restricted helper EXECUTE, server-side authenticated-admin check, immutable-to-clients audit, no public raw event logs. Admin access/security review still operational responsibility. |
| Rank-based unfairness/age-related harm | Context dependent | Human moderation, separate developer usefulness, existing appeal process; legacy age/actual audience and significance of exclusion unresolved. |

## Screening outcome and release conditions

Multiple criteria are present (evaluation/scoring and persistent linking/public observation), with potentially serious correlation and rights-handling consequences. **Conservative screening outcome: undertake a full, proportionate DPIA and record the legitimate-interests assessment before introducing the persistent public attribution processing to production.** Do not mark “DPIA not needed” based only on current small numbers or an18+ checkbox. This is the technical reviewer's recommendation; the accountable owner/reviewer must record the final assessment, necessity, consultation where appropriate and accepted residual risks. If likely high risk remains unmitigated, assess the applicable consultation obligation before processing.

The owner must confirm actual/intended age audience and legacy handling, expected scale, significance of eligibility decisions, retention/rights operator, controller identity and processor/transfer facts. Also assess ICO fee/registration applicability, DPO designation criteria and processing-record/security/incident duties where applicable; no fee, DPO or exemption is assumed merely from individual-operator status.

Sources: [ICO DPIA screening criteria](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/when-do-we-need-to-do-a-dpia/), [ICO DPIA guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/). Account-specific unknowns cannot be resolved by code tests.
