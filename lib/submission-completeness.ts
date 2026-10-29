export type SubmissionIssue={field:string;label:string;reason:string};
export const SUBMISSION_FIELDS=[
 {field:"title",label:"Game title",required:true},
 {field:"developer_name",label:"Developer or studio name",required:true},
 {field:"genre",label:"Genre",required:true},
 {field:"description",label:"Game description",required:true},
 {field:"game_link",label:"Game or build link",url:true},
 {field:"steam_url",label:"Steam store link",url:true},
 {field:"image_url",label:"Thumbnail URL",url:true},
 {field:"release_status",label:"Release status",required:true},
 {field:"release_date",label:"Release date"},
 {field:"ai_type",label:"AI classification",required:true},
 {field:"ai_explanation",label:"AI-use explanation",ai:true},
 {field:"evidence_link",label:"Supporting evidence link",ai:true,url:true},
] as const;
export const AI_CLASSIFICATIONS=["AI-generated","AI-assisted","No AI disclosed"];
export const AI_AREAS=["Programming or code","Artwork or textures","Writing or dialogue","Voice or audio","Music or sound effects","Animation or video","Testing or development tools","Other"];
export const RELEASE_STATUSES=["Released","Upcoming","Not announced"];
export function submissionHttpUrl(value:string){const port=/^https?:\/\/[^/?#@:]+:([0-9]+)/i.exec(value)?.[1];return /^https?:\/\/[^\s/?#@:]+(?::[0-9]{1,5})?(?:[/?#][^\s]*)?$/i.test(value)&&(!port||Number(port)<=65535);}
// Client guidance only. The matching SQL validator is authoritative on every write.
export function submissionIssues(record:Record<string,unknown>):SubmissionIssue[]{
 const ai=["AI-generated","AI-assisted"].includes(String(record.ai_type||"").trim());
 return SUBMISSION_FIELDS.flatMap(rule=>{
  const value=String(record[rule.field]??"").trim();let reason="";
  const required=("required" in rule&&rule.required)||("ai" in rule&&rule.ai&&ai)||(rule.field==="release_date"&&String(record.release_status||"").trim()==="Released");
  if(required&&!value)reason="Required";
  else if(value&&"url" in rule&&!submissionHttpUrl(value))reason="Use a valid HTTP or HTTPS URL";
  else if(rule.field==="steam_url"&&value&&!/^https:\/\/store\.steampowered\.com\/app\/[0-9]+(?:[/?#][^\s]*)?$/i.test(value))reason="Use the game's Steam app store URL";
  else if(rule.field==="ai_type"&&value&&!AI_CLASSIFICATIONS.includes(value))reason="Select an available AI classification";
  else if(rule.field==="release_status"&&value&&!RELEASE_STATUSES.includes(value))reason="Select an available release status";
  else if(rule.field==="release_date"&&value&&String(record.release_status||"").trim()==="Released"&&value>new Date().toISOString().slice(0,10))reason="A released game's release date cannot be in the future";
  else if(rule.field==="release_date"&&value&&String(record.release_status||"").trim()==="Upcoming"&&value<new Date().toISOString().slice(0,10))reason="An upcoming game's planned release date cannot be in the past";
  return reason?[{field:rule.field,label:rule.label,reason}]:[];
 });
}
export function completenessMessage(issues:SubmissionIssue[]){return issues.length?`Please complete these details before we can review your game:\n${issues.map(issue=>`• ${issue.label}: ${issue.reason}`).join("\n")}\nUpdate your submission, then select Resubmit for review.`:"";}
