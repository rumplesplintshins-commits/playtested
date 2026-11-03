
import { createBrowserClient } from "@supabase/ssr";
let recoveryRetryAt=0;
export function recoveryRetrySeconds(){return Math.max(60,Math.ceil((recoveryRetryAt-Date.now())/1000));}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {global:{fetch:async(input,init)=>{
      const response=await fetch(input,init);
      const url=new URL(typeof input==="string"?input:input instanceof URL?input.href:input.url);
      if(url.origin===new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin&&url.pathname==="/auth/v1/recover"){
        // AuthError omits response headers. Retain only a retry deadline, never
        // request bodies, email addresses, links or credentials.
        recoveryRetryAt=0;
        if(response.status===429){
          const retry=response.headers.get("Retry-After");
          if(retry){const delay=Number(retry);const deadline=Number.isFinite(delay)?Date.now()+delay*1000:Date.parse(retry);if(Number.isFinite(deadline))recoveryRetryAt=deadline;}
        }
      }
      return response;
    }}}
  );
}
