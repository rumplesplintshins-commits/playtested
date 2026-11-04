# Merge 24 review record

Branch: `feature/merge-24`. Production release is not authorised.

## Feature status

- M24-01–03: existing accepted implementations preserved; final regression checks pending.
- M24-04: owner contact editor, withdrawal preference and authenticated admin reader implemented. Private data remains in its separate RLS table. Local database policy tests and TypeScript pass. Development integration pending.
- M24-05–06: acquisition and visitor analytics in progress.
- M24-07: optional external gameplay footage pending.
- M24-08: existing description/disclosure/image upload implementation under review.
- M24-09: legal/privacy update pending; owner legal review required before release.
- M24-10: final checks pending.

## Migrations

- `202611040001_private_submission_contacts.sql`: existing migration, already applied in development per handover.
- `202611040002_contact_email_validation.sql`: fixes overescaped email constraint; preserves historical values with NOT VALID while enforcing future writes. Development application pending.

## Verification

- `npx.cmd tsc --noEmit`: passed after contact implementation.
- `node tests/test-submission-contacts.mjs`: passed against PGlite using the actual migrations, including owner writes/reads, consent withdrawal, other-user denial, spoof prevention, email constraints and anonymous denial.
- Live development tests, admin HTTP authorisation and browser acceptance: pending.

## Safeguards

Environment URL and CLI project reference both verified as development `ktifgybnkdaotdxrvjgq`. No production writes, deployment or branch merge performed. Pre-existing untracked schema export and CLI temporary directory are excluded from commits. Never include their contents in logs or commits.
