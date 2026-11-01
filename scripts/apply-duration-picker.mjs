import fs from "node:fs";

const path="app/components/StartPlaytest.tsx";
let source=fs.readFileSync(path,"utf8").replace(/\r\n/g,"\n");

if(!source.includes('import DurationPicker from "./DurationPicker";')){
  const anchor='import {useDeveloperPlan,allowanceError} from "./DeveloperPlan";\n';
  if(!source.includes(anchor))throw new Error("DurationPicker import anchor not found");
  source=source.replace(anchor,anchor+'import DurationPicker from "./DurationPicker";\n');
}

const selectPattern=/<select\s+value=\{estimatedMinutes\}\s+onChange=\{\(event\)\s*=>\s*setEstimatedMinutes\(event\.target\.value\)\}\s+className="[^"]*"\s*>[\s\S]*?<\/select>/g;
const matches=[...source.matchAll(selectPattern)];
if(matches.length!==2)throw new Error(`Expected 2 estimated-duration selects, found ${matches.length}`);
source=source.replace(selectPattern,'<DurationPicker value={estimatedMinutes} onChange={setEstimatedMinutes} isPro={developerPlan.data?.plan === "pro"} />');

// A Free account must never keep a legacy >30 value in the client once plan data resolves.
const stateAnchor='  const developerPlan=useDeveloperPlan();\n';
if(!source.includes('developerPlan.data?.plan !== "pro" && Number(estimatedMinutes) > 30')){
  if(!source.includes(stateAnchor))throw new Error("Developer plan anchor not found");
  source=source.replace(stateAnchor,stateAnchor+'  useEffect(()=>{if(developerPlan.data?.plan !== "pro" && estimatedMinutes && Number(estimatedMinutes) > 30)setEstimatedMinutes("30");},[developerPlan.data?.plan,estimatedMinutes]);\n');
}

fs.writeFileSync(path,source);
console.log("Replaced both native duration selects with controlled DurationPicker.");
