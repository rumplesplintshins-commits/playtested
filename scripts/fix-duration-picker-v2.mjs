import fs from "node:fs";

const path="app/components/StartPlaytest.tsx";
let source=fs.readFileSync(path,"utf8").replace(/\r\n/g,"\n");

// The previous local patch left the original label wrapper behind and replaced only
// the select body. Remove that wrapper around each DurationPicker so the JSX is valid.
const broken=/<label className="block text-sm text-zinc-300">\s*Estimated test time\s*<DurationPicker value=\{estimatedMinutes\} onChange=\{setEstimatedMinutes\} isPro=\{developerPlan\.data\?\.plan === "pro"\} \/>\s*<\/label>/g;
const matches=[...source.matchAll(broken)];
if(matches.length!==2) throw new Error(`Expected 2 wrapped DurationPicker instances, found ${matches.length}`);
source=source.replace(broken,'<div className="block text-sm text-zinc-300"><span className="mb-2 block">Estimated test time</span><DurationPicker value={estimatedMinutes} onChange={setEstimatedMinutes} isPro={developerPlan.data?.plan === "pro"} /></div>');

fs.writeFileSync(path,source);
console.log("Fixed both DurationPicker JSX wrappers.");
