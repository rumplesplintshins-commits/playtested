"use client";
import {useState,type ChangeEvent} from "react";
import {PLATFORM_INFO,type Platform,platformLinkError} from "@/lib/platforms";

type PlatformLinkFieldProps={
  platform:Platform|null;
  steamUrl:string;
  gameLink:string;
  onChange:(field:"steamUrl"|"gameLink",value:string)=>void;
  disabled?:boolean;
};

export default function PlatformLinkField({platform,steamUrl,gameLink,onChange,disabled}:PlatformLinkFieldProps){
  const [blurred,setBlurred]=useState(false);
  const field=platform==="steam"?"steamUrl":"gameLink";
  const value=field==="steamUrl"?steamUrl:gameLink;
  const info=platform?PLATFORM_INFO[platform]:null;
  const showError=blurred&&value.trim()!=="";
  const error=showError?platformLinkError(platform,value):null;
  function handleChange(event:ChangeEvent<HTMLInputElement>){
    const next=event.target.value.trim();
    onChange(field,next);
    setBlurred(true);
  }
  function handleBlur(){setBlurred(true);}
  return (
    <fieldset className="rounded-xl border border-white/10 p-4 sm:p-5">
      <legend className="px-2 text-sm font-semibold text-zinc-100">
        {info?info.linkLabel:"Platform link"}
      </legend>
      <label className="block text-sm text-zinc-300">
        <input
          name={field}
          type="url"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={info?.linkPlaceholder??"https://..."}
          className={`mt-2 block w-full rounded-lg border bg-[#101310] px-4 py-3 text-white focus-visible:outline-2 focus-visible:outline-emerald-300 ${error?"border-amber-300/50":"border-white/15"}${disabled?" opacity-60 pointer-events-none":""}`}
          disabled={disabled}
          aria-invalid={error?true:undefined}
        />
      </label>
      {error&&<p className="mt-2 block text-xs text-red-200">{error}</p>}
      {info&&<p className="mt-2 block text-xs leading-5 text-zinc-500">{info.linkGuidance}</p>}
    </fieldset>
  );
}
