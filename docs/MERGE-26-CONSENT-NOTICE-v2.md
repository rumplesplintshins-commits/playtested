# Archived optional-analytics choice text

Version: `merge26-2026-11-05-v2`. Prepared for Merge26; not proof of production publication or any person's consent. A material purpose/control change requires a new version and explicit renewed choice, not migration of old flags.

Footer disclosure: **Privacy & optional analytics**

> Optional first-party analytics are off until you allow them. With permission, we count page views and approximate visits using a random identifier in this tab for up to 30 minutes of inactivity, plus campaign labels and a broad referral category. No fingerprinting, advertising pixels or analytics cookies. We remember your choice for 180 days in browser storage. You can withdraw here at any time. Privacy signals may suppress collection even when enabled.

> Separately, Steam referral measurement counts intentional View Steam Page clicks from Testing Activity for aggregate game reporting, without account, report or session identifiers. Events are kept for 90 days. Steam opens normally if you decline. Earlier permissions are not carried into these new choices.

Separate fieldsets:

- Page analytics: **Allow page analytics** / **Reject page analytics**.
- Steam referrals: **Allow Steam referrals** / **Reject Steam referrals**.

Each saves `{allowed, at}` under its own `pages` or `steam` scope alongside the notice `version` in `playtested.analytics.preference.v1`. Absence, invalid/old version, invalid/future timestamp and180day expiry mean off. Changing either purpose leaves the other unchanged. No account, persistent receipt, device, IP or user-agent field is added. This is browser-local choice evidence, not a central ledger; clearing storage loses it. Rejected choices are recorded too. Expired data can remain in browser storage until overwritten/cleared without authorising collection.

Page withdrawal clears the tab session where browser access permits; Steam navigation never depends on a successful recording request. A persistence failure leaves current-tab withdrawal effective and reports the inability to save it for reopening. A failed grant never creates new permission. Privacy signals continue to suppress collection. Server request consent is still a client assertion, not independent proof of a person's choice; this design does not claim more.

See the exact Privacy/cookie proposals in OWNER-PRIVACY-DECISIONS and the implemented controls in PrivacyAnalytics/acquisition. The accountable owner must review final notice publication and the documented evidence limitations; tests alone do not establish valid consent or legal compliance.
