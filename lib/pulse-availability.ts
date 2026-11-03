export type PulseAvailability="available"|"busy"|"unavailable"|"disabled"|"unknown"|"unsupported";
export function pulseMessage(state:string,job?:{status?:string;updated_at?:string}){
 if(job){
  if(job.status==="FAILED")return "Automated checks failed. The previous attempt and report are preserved. Retry explicitly when a worker is ready.";
  if(job.status==="QUEUED")return "Automated technical checks are queued. Listing review can continue while they run. A queue place does not guarantee immediate execution.";
  if(!job.updated_at&&["ACQUIRING_BUILD","SECURITY_SCAN","TESTING","PROCESSING_RESULTS"].includes(job.status||""))return "Current execution progress is unconfirmed. Listing review can continue.";
  if(["ACQUIRING_BUILD","SECURITY_SCAN","TESTING","PROCESSING_RESULTS"].includes(job.status||""))return job.updated_at&&Date.now()-Date.parse(job.updated_at)>600000?"This check has not reported progress recently. Runner recovery is pending; listing review can continue.":"Automated technical checks are processing. Listing review can continue.";
  return `Existing automated checks: ${job.status||"status unknown"}. History is retained; successful and blocked attempts are reused for unchanged input.`;
 }
 if(state==="input_changed")return "The saved build input has changed. Choose Run checks to check the current input instead of retrying the old attempt.";
 if(state==="unsupported")return "Automated checks support HTTPS browser-build ZIP links containing index.html at the archive root. This submission's link/platform is not a supported automatic input.";
 if(state==="available")return "Automated technical checks are available for supported builds.";
 if(state==="busy")return "Automated technical checks are available; the worker is busy. Supported builds may queue for later processing.";
 if(state==="disabled"||state==="unavailable")return "Automated technical checks are currently unavailable. You can still submit your game for listing and AI-disclosure review.";
 return "We couldn't confirm automated-check availability. Your submission can still proceed.";
}
