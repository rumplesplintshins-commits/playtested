import fs from "node:fs";

function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`Could not find ${label}`);
  return text.replace(from, to);
}

const correctionPath = "app/components/SubmissionCorrection.tsx";
let correction = fs.readFileSync(correctionPath, "utf8");

correction = replaceOnce(correction,
' const [areas,setAreas]=useState<string[]>([]);',
' const [areas,setAreas]=useState<string[]>([]);\n const [imageUploading,setImageUploading]=useState(false);',
'correction upload state');

correction = replaceOnce(correction,
' function submit(event:FormEvent){event.preventDefault();void save(!listingKind);}',
` async function handleImageUpload(file:File|null){
  if(!file)return;
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setError("Use a JPG, PNG or WebP image.");return;}
  if(file.size>5*1024*1024){setError("Game thumbnail must be 5 MB or smaller.");return;}
  setImageUploading(true);setError("");
  try{
   const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();
   if(!user){setError("Sign in again before uploading an image.");return;}
   const extension=file.name.split(".").pop()?.toLowerCase()||"jpg";const path=\`\${user.id}/\${crypto.randomUUID()}.\${extension}\`;
   const {error:uploadError}=await supabase.storage.from("game-thumbnails").upload(path,file,{contentType:file.type,upsert:false});
   if(uploadError){setError(uploadError.message||"Thumbnail upload failed.");return;}
   const {data:publicUrl}=supabase.storage.from("game-thumbnails").getPublicUrl(path);
   setFields(value=>({...value,image_url:publicUrl.publicUrl}));setDirty(true);
  }finally{setImageUploading(false);}
 }
 function submit(event:FormEvent){event.preventDefault();void save(!listingKind);}`,
'correction upload handler');

correction = replaceOnce(correction,
'  <h1 className="mt-5 text-3xl font-bold">{listingKind?"Edit listing":"Complete submission information"}</h1><p className="mt-2 text-sm text-zinc-400">Update the same submission. Its game links, campaigns and feedback stay connected.</p>',
'  <h1 className="mt-5 text-3xl font-bold tracking-tight">{listingKind?"Edit listing":"Complete submission information"}</h1><p className="mt-3 max-w-2xl text-base leading-7 text-zinc-300">Update the same submission. Its game links, campaigns and feedback stay connected.</p>',
'correction heading typography');

const oldRender='''     return <div key={rule.field}><label htmlFor={common.id} className="text-sm font-semibold">{rule.label}</label>{isSelect?<select {...common}><option value="">Select an option</option>{options.map(value=><option key={value}>{value}</option>)}</select>:multiline?<textarea {...common} rows={4}/>:<input {...common} type={rule.field==="release_date"?"date":"text"} inputMode={"url" in rule?"url":undefined}/>}\n     <p id={`guidance-${rule.field}`} className={`mt-2 text-xs ${issue?"text-amber-200":"text-zinc-400"}`}>{issue?.reason||("ai" in rule?"Required when AI-assisted use is disclosed. No explanation is required when No AI used is selected.":rule.field==="game_link"?"Optional. If provided, use an HTTP or HTTPS link. No URL is fetched by this check.":rule.field==="release_date"?"Required for a released game; optional otherwise.":rule.field==="image_url"?"A thumbnail is required. New submissions can upload an image or provide its URL.":"Use the same details you want reviewed.")}</p></div>;''';
const newRender='''     const countable=rule.field==="description"||rule.field==="ai_explanation";\n     return <div key={rule.field} className="space-y-2"><div className="flex items-end justify-between gap-3"><label htmlFor={common.id} className="text-[15px] font-semibold text-zinc-100">{rule.label}</label>{countable&&<span className="shrink-0 text-xs tabular-nums text-zinc-500">{(fields[rule.field]||"").length} / 2,000</span>}</div>{isSelect?<select {...common}><option value="">Select an option</option>{options.map(value=><option key={value}>{value}</option>)}</select>:rule.field==="image_url"?<><div className="grid gap-3 sm:grid-cols-[auto_1fr]"><label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-300/15"><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy||imageUploading} onChange={event=>void handleImageUpload(event.target.files?.[0]||null)}/>{imageUploading?"Uploading…":"Upload image"}</label><input {...common} type="url" inputMode="url" placeholder="Or paste a direct image URL"/></div>{fields.image_url&&<div className="overflow-hidden rounded-lg border border-white/10 bg-black/30"><img src={fields.image_url} alt="Game thumbnail preview" className="aspect-video w-full object-cover"/></div>}</>:multiline?<textarea {...common} maxLength={2000} rows={rule.field==="description"?8:6} style={{minHeight:rule.field==="description"?"14rem":"10rem",maxHeight:"32rem"}} onInput={event=>{const element=event.currentTarget;element.style.height="auto";element.style.height=`${Math.min(element.scrollHeight,512)}px`;}}/>:<input {...common} type={rule.field==="release_date"?"date":"text"} inputMode={"url" in rule?"url":undefined}/>}\n     <p id={`guidance-${rule.field}`} className={`text-sm leading-6 ${issue?"text-amber-200":"text-zinc-400"}`}>{issue?.reason||("ai" in rule?"Required when AI-assisted use is disclosed. No explanation is required when No AI used is selected.":rule.field==="game_link"?"Optional. If provided, use an HTTP or HTTPS link. No URL is fetched by this check.":rule.field==="release_date"?"Required for a released game; optional otherwise.":rule.field==="image_url"?"Upload a JPG, PNG or WebP up to 5 MB, or paste a direct image URL. Recommended: 16:9, at least 1280 × 720. Other sizes may be cropped to fit.":"Use the same details you want reviewed.")}</p></div>;''';
correction = replaceOnce(correction, oldRender, newRender, 'correction field rendering');

correction=correction.replace('className="space-y-5">{SUBMISSION_FIELDS.map','className="space-y-7">{SUBMISSION_FIELDS.map');
correction=correction.replace('className="rounded-xl border border-white/10 p-4"><legend className="text-sm font-semibold">AI-use areas (optional)</legend>','className="rounded-xl border border-white/10 p-5"><legend className="px-1 text-[15px] font-semibold text-zinc-100">AI-use areas (optional)</legend>');
correction=correction.replace('className="mt-2 grid gap-3 sm:grid-cols-2"','className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2"');
correction=correction.replace('className="flex items-start gap-2 text-sm text-zinc-300"','className="flex items-start gap-3 text-sm leading-6 text-zinc-200"');
correction=correction.replace('className="mt-3 text-xs text-zinc-400">These are the same optional disclosure choices','className="mt-4 text-sm leading-6 text-zinc-400">These are the same optional disclosure choices');
fs.writeFileSync(correctionPath, correction);

const workspacePath="app/components/DeveloperWorkspace.tsx";
let workspace=fs.readFileSync(workspacePath,"utf8");
workspace=replaceOnce(workspace,
' const visible=items.filter(item=>item.title.toLowerCase().includes(selection.search.trim().toLowerCase())&&(effectiveFilter==="All"||(effectiveFilter==="Active playtest"?item.active:effectiveFilter==="Current Hub feedback"?item.hasFeedback:item.status===effectiveFilter)));',
' const priority=(status:string)=>status==="Needs More Information"?0:status==="Pending Review"||status==="Pending"?1:status==="Approved"?2:status==="Rejected"?3:4;\\n const visible=items.filter(item=>item.title.toLowerCase().includes(selection.search.trim().toLowerCase())&&(effectiveFilter==="All"||(effectiveFilter==="Active playtest"?item.active:effectiveFilter==="Current Hub feedback"?item.hasFeedback:item.status===effectiveFilter))).sort((a,b)=>selection.tab==="submissions"||selection.tab==="claims"?priority(a.status)-priority(b.status):0);'.replace('\\\\n','\\n'),
'workspace status priority');
fs.writeFileSync(workspacePath,workspace);
console.log("Updated correction form UX and prioritised requests needing information.");
