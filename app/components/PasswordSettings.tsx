"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {createClient} from "@/lib/supabase";
import {createClient as isolatedClient,type Session} from "@supabase/supabase-js";
const field="mt-1 block w-full rounded-lg border border-white/25 bg-black p-3 text-white focus-visible:outline-2 focus-visible:outline-emerald-300";
const button="rounded-lg border border-emerald-300/40 px-4 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300";
export default function PasswordSettings({mode}:{mode:"request"|"reset"|"change"}){
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[confirm,setConfirm]=useState(""),[current,setCurrent]=useState(""),[nonce,setNonce]=useState("");
 const [visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState(""),[ready,setReady]=useState(false),[done,setDone]=useState(false),[verify,setVerify]=useState(false),[cooldown,setCooldown]=useState(false);
 const recovery=useRef<Session|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),submitting=useRef(false);
 const [checking,setChecking]=useState(mode==="reset");
 useEffect(()=>{
  if(mode!=="reset")return;
  const client=createClient();
  const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{
   if(event==="PASSWORD_RECOVERY"&&session){recovery.current=session;setEmail(session.user.email||"");setReady(true);setChecking(false);setError("");}
   else if(event==="SIGNED_OUT"||(session&&recovery.current&&session.user.id!==recovery.current.user.id)){recovery.current=null;setReady(false);}
  });
  // An ordinary signed-in session must never enable this recovery form.
  void client.auth.getSession().then(()=>{window.history.replaceState(null,"","/reset-password");setChecking(false);if(!recovery.current)setError("This recovery link is invalid, expired or already used. Request a new email and open it in the same browser.");});
  return()=>subscription.unsubscribe();
 },[mode]);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 function throttle(){setCooldown(true);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setCooldown(false),60000);}
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(submitting.current||done||(mode==="request"&&cooldown))return;
  setError("");setMessage("");
  if(mode!=="request"&&(password.length<8||password.length>128||!password.trim()||password!==confirm)){setError("Use 8–128 characters and make sure both new passwords match. Your project's password rules also apply.");return;}
  submitting.current=true;setBusy(true);
  try{
   const client=createClient();
   if(mode==="request"){
    throttle();const {error}=await client.auth.resetPasswordForEmail(email.trim(),{redirectTo:new URL("/reset-password",window.location.origin).toString()});
    if(error&&(error.status===429||error.code==="over_email_send_rate_limit"))setError("Too many requests. Wait before trying again; the email service may require a longer pause.");
    else if(error&&(!error.status||error.status>=500))setError("Recovery is temporarily unavailable. Please wait and try again.");
    else setMessage("If an account exists for that address, a password recovery email will be sent. Check your inbox and spam folder.");
   }else{
    const {data:{session}}=mode==="reset"?{data:{session:recovery.current}}:await client.auth.getSession();
    if(!session)throw new Error("Your session is no longer valid. Sign in again or request another recovery email.");
    // Bind updates to the captured session, independently of other tabs/accounts.
    const bound=isolatedClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const established=await bound.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});
    if(established.error||established.data.user?.id!==session.user.id)throw new Error("Your session could not be verified. Sign in again or request a new recovery email.");
    const {error}=await bound.auth.updateUser({password,...(mode==="change"?{current_password:current,...(nonce?{nonce}: {})}:{})});
    if(error){
     if(["reauthentication_needed","reauthentication_not_valid"].includes(error.code||"")){setVerify(true);throw new Error("Verify this change using an emailed code, then try again.");}
     if(["session_not_found","refresh_token_not_found","refresh_token_already_used","otp_expired"].includes(error.code||""))throw new Error("This session expired or was already used. Sign in again or request another recovery email.");
     if(error.code==="weak_password")throw new Error("Choose a stronger password that meets the project's password rules.");
     if(error.code==="same_password")throw new Error("Choose a password different from your current password.");
     throw new Error(mode==="change"?"Password change failed. Check your current password and verification code, or sign in again.":"The password could not be reset. Try a stronger password or request a new recovery link.");
    }
    setPassword("");setConfirm("");setCurrent("");setNonce("");setDone(true);recovery.current=null;
    if(mode==="reset"){await client.auth.signOut({scope:"local"});setMessage("Password reset. Sign in with your new password.");}else setMessage("Password changed successfully.");
   }
  }catch(e){setError(mode==="request"?"Recovery is temporarily unavailable. Please wait and try again.":e instanceof Error?e.message:"Your password was not changed. Please try again.");}
  finally{submitting.current=false;setBusy(false);}
 }
 async function sendCode(){if(busy||cooldown)return;setBusy(true);setError("");try{const {error}=await createClient().auth.reauthenticate();if(error)throw error;throttle();setMessage("Check your account email for the verification code.");}catch{setError("The verification code could not be sent. Wait and retry, or sign in again.");}finally{setBusy(false);}}
 const title=mode==="request"?"Forgot password?":mode==="reset"?"Reset password":"Change password";
 const Heading=mode==="change"?"h3":"h1";
 return <section aria-label={title} className="space-y-4">
  <Heading className="text-2xl font-semibold">{title}</Heading>
  {checking&&<p role="status" className="text-sm text-zinc-300">Checking recovery link...</p>}
  {mode==="request"&&<p className="text-sm leading-6 text-zinc-300">Enter your account email. Open the recovery link in this browser to choose a new password.</p>}
  {mode==="reset"&&ready&&<p className="break-words text-sm text-zinc-300">Resetting the password for {email}.</p>}
  {error&&<p role="alert" className="rounded-lg bg-amber-300/10 p-3 text-sm text-amber-100">{error}</p>}
  {message&&<p role="status" className="rounded-lg bg-emerald-300/10 p-3 text-sm text-emerald-100">{message}</p>}
  {!done&&(mode!=="reset"||ready)&&<form className="space-y-4" onSubmit={submit}>
   {mode==="request"?<label className="block text-sm">Email address<input required type="email" autoComplete="email" className={field} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label>:<>
    {mode==="change"&&<label className="block text-sm">Current password<input required type={visible?"text":"password"} autoComplete="current-password" className={field} value={current} onChange={e=>setCurrent(e.target.value)} disabled={busy}/></label>}
    <label className="block text-sm">New password<input required minLength={8} maxLength={128} type={visible?"text":"password"} autoComplete="new-password" className={field} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>
    <label className="block text-sm">Confirm new password<input required minLength={8} maxLength={128} type={visible?"text":"password"} autoComplete="new-password" className={field} value={confirm} onChange={e=>setConfirm(e.target.value)} disabled={busy}/></label>
    <button type="button" className={button} aria-pressed={visible} onClick={()=>setVisible(v=>!v)}>{visible?"Hide passwords":"Show passwords"}</button>
    {verify&&<div className="space-y-3"><button type="button" className={button} disabled={busy||cooldown} onClick={()=>void sendCode()}>Send verification code</button><label className="block text-sm">Verification code<input autoComplete="one-time-code" className={field} value={nonce} onChange={e=>setNonce(e.target.value)}/></label></div>}
   </>}
   <button className={button} disabled={busy||(mode==="request"&&cooldown)}>{busy?"Please wait...":mode==="request"?cooldown?"Wait before requesting again":"Send recovery email":"Save new password"}</button>
  </form>}
  <div className="flex flex-wrap gap-4 text-sm"><Link className="text-emerald-300 underline underline-offset-4" href="/login">Back to login</Link>{mode!=="request"&&<Link className="text-emerald-300 underline underline-offset-4" href="/forgot-password">Request another recovery email</Link>}</div>
 </section>;
}
