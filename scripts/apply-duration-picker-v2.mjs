import fs from "node:fs";

const path="app/components/StartPlaytest.tsx";
let source=fs.readFileSync(path,"utf8").replace(/\r\n/g,"\n");

if(!source.includes('import DurationPicker from "./DurationPicker";')){
  const anchor='import {useDeveloperPlan,allowanceError} from "./DeveloperPlan";\n';
  if(!source.includes(anchor)) throw new Error("DurationPicker import anchor not found");
  source=source.replace(anchor,anchor+'import DurationPicker from "./DurationPicker";\n');
}

// Match the two Estimated test time native selects by their option contents rather than brittle attributes.
const selectPattern=/<select\b[^>]*>[\s\S]*?<option value="">Not specified<\/option>[\s\S]*?<option value="15">15 minutes<\/option>[\s\S]*?<option value="30">30 minutes<\/option>[\s\S]*?<option value="45"[^>]*>[\s\S]*?45 minutes[\s\S]*?<\/option>[\s\S]*?<option value="180"[^>]*>[\s\S]*?3\+ hours[\s\S]*?<\/option>[\s\S]*?<\/select>/g;
const matches=[...source.matchAll(selectPattern)];
if(matches.length!==2) throw new Error(`Expected 2 estimated-duration selects, found ${matches.length}`);
source=source.replace(selectPattern,'<DurationPicker value={estimatedMinutes} onChange={setEstimatedMinutes} isPro={developerPlan.data?.plan === "pro"} />');

// Free/non-confirmed-Pro accounts cannot retain a legacy >30-minute value in client state.
const stateAnchor='  const developerPlan=useDeveloperPlan();\n';
const clamp='  useEffect(()=>{if(developerPlan.data?.plan !== "pro" && estimatedMinutes && Number(estimatedMinutes) > 30)setEstimatedMinutes("30");},[developerPlan.data?.plan,estimatedMinutes]);\n';
if(!source.includes(clamp)){
  if(!source.includes(stateAnchor)) throw new Error("Developer plan anchor not found");
  source=source.replace(stateAnchor,stateAnchor+clamp);
}

fs.writeFileSync(path,source);
console.log("Replaced both native duration selects with controlled DurationPicker.");
