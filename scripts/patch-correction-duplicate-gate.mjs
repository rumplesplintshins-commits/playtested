import fs from "node:fs";

const path = "app/components/SubmissionCorrection.tsx";
let source = fs.readFileSync(path, "utf8");
const newline = source.includes("\r\n") ? "\r\n" : "\n";
const normalized = source.replace(/\r\n/g, "\n");
source = normalized;

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly 1 match, found ${count}`);
  source = source.replace(before, after);
}

replaceOnce(
  ' async function save(resubmit:boolean){if(busy||!data)return;setBusy(true);setError("");setNotice("");try{\n  let payload:Record<string,unknown>={...fields,ai_areas:areas,release_date:fields.release_date||null,image_url:fields.image_url||null,steam_url:fields.steam_url||null};',
  ` async function correctionDuplicateMessage():Promise<string|null>{\n  const supabase=createClient();\n  const steamUrl=(fields.steam_url||"").trim();\n  let steamAppId:string|null=null;\n  if(steamUrl){try{const url=new URL(steamUrl);const match=url.pathname.match(/^\\/app\\/(\\d+)(?:\\/|$)/i);if(url.protocol==="https:"&&(url.hostname==="store.steampowered.com"||url.hostname==="www.store.steampowered.com")&&match)steamAppId=match[1];}catch{steamAppId=null;}}\n  if(steamAppId){\n   const {data:approved,error:approvedError}=await supabase.from("approved_games").select("id,title").eq("steam_app_id",steamAppId).maybeSingle();\n   if(approvedError)throw approvedError;\n   if(approved)return \`This Steam game is already on Playtested as \\"\${String(approved.title||fields.title||"this game")}\\". Resubmission is blocked. Use Submit a Game with this Steam URL to open the developer claim flow.\`;\n   const {data:imported,error:importedError}=await supabase.from("imported_games").select("id,title").eq("steam_app_id",steamAppId).eq("catalogue_eligible",true).eq("metadata_backfill_status","complete").not("title","is",null).not("developer_name","is",null).not("genre","is",null).not("image_url","is",null).maybeSingle();\n   if(importedError)throw importedError;\n   if(imported)return \`This Steam game is already in the Playtested catalogue as \\"\${String(imported.title||fields.title||"this game")}\\". Resubmission is blocked. Use Submit a Game with this Steam URL to open the developer claim flow.\`;\n  }\n  const title=(fields.title||"").trim();const developerName=(fields.developer_name||"").trim();\n  if(title){\n   const {data:rows,error:duplicateError}=await supabase.rpc("find_possible_game_duplicates",{p_title:title,p_developer_name:developerName});\n   if(duplicateError)throw duplicateError;\n   const duplicate=(Array.isArray(rows)?rows:[]).find((row:Record<string,unknown>)=>!(row.source==="submission"&&String(row.record_id)===id));\n   if(duplicate)return \`\\"\${String(duplicate.title||title)}\\" may already be on Playtested. Resubmission is blocked so an existing catalogue game cannot be created through the correction flow. Start a new submission to use the claim / different-game check.\`;\n  }\n  return null;\n }\n async function save(resubmit:boolean){if(busy||!data)return;setBusy(true);setError("");setNotice("");try{\n  if(resubmit&&!listingKind){const duplicateMessage=await correctionDuplicateMessage();if(duplicateMessage){setError(duplicateMessage);return;}}\n  let payload:Record<string,unknown>={...fields,ai_areas:areas,release_date:fields.release_date||null,image_url:fields.image_url||null,steam_url:fields.steam_url||null};`,
  "resubmission duplicate gate"
);

fs.writeFileSync(path, source.replace(/\n/g, newline), "utf8");
console.log("Correction duplicate gate applied successfully.");
