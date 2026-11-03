# GDPR rights request procedure

Status: operational procedure for Playtested production review.

## Controller and contact

Playtested is an independent website operated by Nathan Rose, trading as Playtested, in the United Kingdom. Privacy and data-protection requests can be sent to `support.playtested@gmail.com` or through an available Playtested support/contact route.

A valid request does not need to mention GDPR or use a particular form. Treat a clear request to access, correct, erase, restrict, export or object to use of personal information as a rights request.

## Intake

1. Record the date received, request type, account/email or other identifier supplied by the requester, and the channel used.
2. Acknowledge the request promptly.
3. Verify identity only where there is a reasonable doubt. Request only information proportionate to that doubt; never request passwords, authentication tokens or recovery keys.
4. Record any clarification or identity information requested and received.
5. Set the response deadline to no later than one calendar month after the valid request is received. For an operational safety margin, target 28 days.
6. If a request is unusually complex or numerous requests are received from the same person, any lawful extension must be communicated within the original one-month period with the reason.

## Access

Search the systems reasonably likely to contain the requester's personal information, including Supabase account/profile data, submissions and developer relationships, playtest participation and feedback, moderation/review records, notifications, account-deletion requests and relevant support correspondence.

Do not disclose another person's personal information merely because it appears in a record associated with the requester. Review exports before release.

## Rectification

Correct inaccurate account/profile information where possible. Where a correction affects historical moderation, testing or listing records, preserve necessary audit integrity while correcting or annotating the inaccurate personal attribution.

## Erasure

Use the account-erasure design and implementation rather than ad-hoc SQL deletion. The right to erasure is not absolute; assess any proposed retention against the purpose and lawful basis rather than applying a blanket refusal.

The intended Playtested process is:

`pending -> processing -> application data deleted/de-identified -> Auth identity deleted -> completed`

Completed tester feedback may remain only where it has been effectively de-identified and is still needed as useful product/testing history. Current account-only records and relationships should be removed. Temporary security/moderation retention must be justified and time-limited.

Do not mark a request completed until all required application and authentication stages have succeeded.

## Restriction and objection

Where a valid restriction applies, stop the relevant use while retaining only what is permitted. For an objection to legitimate-interest processing, document the relevant purpose and balancing decision. Do not treat an objection as an automatic request to delete unrelated service data.

## Portability

Where portability applies, provide the relevant information supplied by the user in a structured, commonly used, machine-readable format. CSV or JSON are preferred depending on the data shape. Review the export for third-party personal information before release.

## Refusal or partial refusal

Any refusal must be decided case by case and documented. Tell the requester the reason, their right to complain to the ICO and their ability to seek a judicial remedy. Do not use a blanket rule that historic records can never be erased.

## Recipients and public information

If personal information that is being erased has been disclosed to another recipient or made public, assess whether Playtested must notify recipients or take reasonable steps regarding copies/links. Record the outcome.

## Completion record

Keep a minimal audit record of the request, dates, request type, decision, actions completed, any lawful retention and completion date. Do not retain a full copy of erased account data merely to prove that erasure occurred.

## Production gate

The current self-service account deletion page records a request but is not, by itself, a completed erasure process. Do not describe account deletion as immediate or fully automated until the tested service-role erasure processor is deployed and a current production recovery point exists.
