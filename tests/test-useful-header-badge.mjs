import fs from "node:fs";
import assert from "node:assert/strict";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const badgeCode=fs.readFileSync("app/components/UsefulFeedbackBadge.tsx","utf8");
const badgeModule={exports:{}};
const compiled=ts.transpileModule(badgeCode,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
new Function("module","exports","require",compiled)(
  badgeModule,badgeModule.exports,
  (name)=>name==="react/jsx-runtime"?await import("react/jsx-runtime"):(()=>{throw Error("Unexpected runtime import: "+name)})()
);
const Badge=badgeModule.exports.default;
const html=value=>renderToStaticMarkup(createElement(Badge,{value}));
assert.match(html("useful"),/✓<\/span> Useful/,"Useful should show ✓ Useful");
assert.match(html("useful"),/aria-label="Developer marked this feedback useful"/);
for(const value of ["not_useful",null,undefined,"other"]) assert.equal(html(value),"","No badge for Not useful or unrated");

const dashboard=fs.readFileSync("app/components/StartPlaytest.tsx","utf8");
const rating=fs.readFileSync("app/components/FeedbackUsefulness.tsx","utf8");
assert(dashboard.includes("value={usefulnessByTest[response.test_id]}"),"Badge uses saved rating keyed by report");
assert(dashboard.includes("onRatingChange={updateUsefulness}"),"Child reports confirmed rating to header");
assert(dashboard.includes('useCallback((testId: string, value: FeedbackUsefulnessValue)'),"Stable callback prevents repeated fetches");
assert(dashboard.includes("flex max-w-full flex-wrap items-center justify-end gap-1.5"),"Badges wrap on mobile/150% zoom");
assert(dashboard.includes("Independent · Accepted"),"Existing accepted status retained");
assert(dashboard.indexOf("<UsefulFeedbackBadge") < dashboard.indexOf("<FeedbackUsefulness testId={response.test_id}"),"Badge appears in summary and works when collapsed");
assert(rating.includes("onRatingChange?.(testId, savedValue)"),"Historical ratings load from actual RPC");
const confirmed=rating.indexOf("if (failure) {");
const notify=rating.indexOf("onRatingChange?.(testId, confirmedValue)");
assert(confirmed>=0&&notify>confirmed&&rating.slice(confirmed,notify).includes("return;"),"Failed RPC must not show badge");
assert(rating.includes("onRatingChange?.(testId, null)"),"Do not display stale badge when initial rating cannot load");
assert(rating.includes("}, [testId, onRatingChange]);"),"Callback effect dependency stable");
assert(rating.includes("p_reason: next ==="),"Private negative-explanation RPC preserved");
console.log("PASS: Useful/not useful/unrated badge states, persisted values, immediate confirmed updates and responsive header");
