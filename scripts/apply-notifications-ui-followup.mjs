import fs from "node:fs";

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  return source.replace(before, after);
}

// 1. Sharing & traffic: hide an empty destination selector and remove the technical UTM medium field.
const trafficPath = "app/components/GameLinksEngagement.tsx";
let traffic = fs.readFileSync(trafficPath, "utf8").replace(/\r\n/g, "\n");
traffic = traffic.replace(',[medium,setMedium]=useState("")', '');
traffic = traffic.replace('p_medium:marketingTag(medium,network==="reddit"||network==="discord"?"social":"referral")', 'p_medium:network==="reddit"||network==="discord"?"social":"referral"');
traffic = replaceOnce(
  traffic,
  '   <label className="text-sm">Destination<select className={field} value={selected} onChange={e=>setDestination(e.target.value)}>{!sharingCampaign&&context.public_path&&<option value="game">Public game page</option>}{context.campaigns.length>0&&audience!=="own_community"&&<option value="campaign">Tester Hub campaign</option>}{context.campaigns.length>0&&audience!=="playtested_testers"&&<option value="community">Community playtest invitation</option>}</select></label>\n',
  '   {(context.public_path||context.campaigns.length>0)&&<label className="text-sm">Destination<select className={field} value={selected} onChange={e=>setDestination(e.target.value)}>{!sharingCampaign&&context.public_path&&<option value="game">Public game page</option>}{context.campaigns.length>0&&audience!=="own_community"&&<option value="campaign">Tester Hub campaign</option>}{context.campaigns.length>0&&audience!=="playtested_testers"&&<option value="community">Community playtest invitation</option>}</select></label>}\n',
  "conditional destination"
);
traffic = replaceOnce(
  traffic,
  '   <details className="sm:col-span-2"><summary className="cursor-pointer text-sm text-zinc-400">Advanced: tracking medium</summary><label className="mt-2 block text-sm">Medium (optional)<input className={field} maxLength={64} value={medium} onChange={e=>setMedium(e.target.value)} placeholder={network==="reddit"||network==="discord"?"social":"referral"}/></label></details>\n',
  '',
  "tracking medium UI"
);
fs.writeFileSync(trafficPath, traffic);

// 2. Duration selector: native select menus do not communicate disabled choices clearly on Windows.
// Keep the same select semantics, but prefix locked Free choices with a lock marker and leave them disabled.
const playtestPath = "app/components/StartPlaytest.tsx";
let playtest = fs.readFileSync(playtestPath, "utf8").replace(/\r\n/g, "\n");
const locked = [
  ["45", "45 minutes"], ["60", "1 hour"], ["90", "1 hour 30 minutes"], ["120", "2 hours"], ["180", "3+ hours"]
];
for (const [value,label] of locked) {
  const before = `<option value="${value}" disabled={developerPlan.data?.plan !== "pro"}>${label}</option>`;
  const after = `<option value="${value}" disabled={developerPlan.data?.plan !== "pro"}>{developerPlan.data?.plan === "pro" ? "${label}" : "🔒 ${label}"}</option>`;
  playtest = playtest.split(before).join(after);
}
fs.writeFileSync(playtestPath, playtest);

// 3. Tester record: show a positive usefulness mark on accepted feedback when a developer has marked it Useful.
const testerPath = "app/tester/page.tsx";
let tester = fs.readFileSync(testerPath, "utf8").replace(/\r\n/g, "\n");
tester = replaceOnce(
  tester,
  '  const [reviewHistoryError,setReviewHistoryError]=useState("");\n',
  '  const [reviewHistoryError,setReviewHistoryError]=useState("");\n  const [feedbackUsefulness,setFeedbackUsefulness]=useState<Record<string,"useful"|"not_useful">>({});\n',
  "tester usefulness state"
);
tester = replaceOnce(
  tester,
  '      setClaims((claimsData ?? []) as TestClaim[]);\n',
  '      setClaims((claimsData ?? []) as TestClaim[]);\n      const usefulness=await supabase.rpc("get_my_feedback_usefulness");\n      if(active&&!usefulness.error){\n        const mapped:Record<string,"useful"|"not_useful">={};\n        for(const row of usefulness.data??[]){if(row?.test_id&&(row.usefulness==="useful"||row.usefulness==="not_useful"))mapped[row.test_id]=row.usefulness;}\n        setFeedbackUsefulness(mapped);\n      }\n',
  "tester usefulness load"
);
tester = replaceOnce(
  tester,
  '                      <p className="mt-2 text-sm text-zinc-300">{feedbackQualityLabel(claim)}</p>\n',
  '                      <p className="mt-2 text-sm text-zinc-300">{feedbackQualityLabel(claim)}</p>\n                      {feedbackUsefulness[claim.id]==="useful"&&<span className="mt-2 inline-flex rounded-full border border-[#77f29b]/30 bg-[#77f29b]/10 px-2.5 py-1 text-xs font-semibold text-[#77f29b]">Developer marked this feedback useful</span>}\n',
  "tester usefulness badge"
);
fs.writeFileSync(testerPath, tester);

console.log("Applied sharing cleanup, locked duration labels and tester usefulness badge.");
