import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const page = readFileSync(new URL("../app/paid-playtesting/page.tsx", import.meta.url), "utf8");
for(const price of ['price: "£7"','price: "£13"','price: "£17"','reward: "£5"','reward: "£10"','reward: "£14"']) assert(page.includes(price), "Missing pricing: "+price);
for(const phrase of ["Three steps from build to feedback", "Simple sessions. Fair rewards", "A few useful answers", "Not live yet"]) assert(page.includes(phrase), "Missing section: "+phrase);
assert(page.includes("robots: { index: false, follow: false }"), "Preview must not be indexed");
assert(page.includes('type="button" disabled'), "Paid controls must remain disabled");
assert(!/stripe|checkout|createPaymentIntent|onClick=/.test(page), "Preview must not process paid bookings");
console.log("PASS paid-playtesting preview: pricing, text, noindex and disabled payments");
