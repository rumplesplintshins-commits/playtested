import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const review=readFileSync(new URL("../app/components/FeedbackReviewQueue.tsx", import.meta.url), "utf8");
const summaryStart=review.indexOf('visible.map(item => view === "history"');
const summaryEnd=review.indexOf('</summary>', summaryStart);
assert(summaryStart>0 && summaryEnd>summaryStart, "Reviewed report summary must exist");
const header=review.slice(summaryStart,summaryEnd);
assert(header.includes('item.report.feedback_usefulness === "not_useful"'), "Show flag only when saved developer rating is Not useful");
assert(header.includes("Developer marked Not useful"), "Admin sees negative usefulness without opening report");
assert(header.includes('group-open:hidden') && header.includes('group-open:inline'), "Collapsed and expanded summaries retain their controls");
assert(header.includes('flex max-w-full flex-wrap items-center justify-end gap-2'), "Badge and expand action wrap on narrow screens");
assert(header.includes('border-amber-300/25') && header.includes('text-amber-200'), "The negative badge uses subtle amber styling");
assert(!header.includes("privateReason.reason"), "Private explanation must remain inside expanded admin-only report");
assert(review.includes('t.feedback_usefulness === "not_useful" && privateReason'), "Expanded report still shows admin-only explanation");
assert(review.includes('get_admin_feedback_not_useful_reasons'), "Admin-only data permission path remains");
console.log("PASS: admin Reviewed header shows Not useful state, mobile layout, retained expand controls and private explanation isolation");
