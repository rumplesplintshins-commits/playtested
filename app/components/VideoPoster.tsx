"use client";
/* eslint-disable @next/next/no-img-element -- Posters use authorised first-party media and existing catalogue images directly. */
import { useState } from "react";

export default function VideoPoster({ sources }: { sources: string[] }) {
  return <Poster key={sources.join("|")} sources={sources} />;
}
function Poster({ sources }: { sources: string[] }) {
  const [index, setIndex] = useState(0);
  const src = sources[index];
  const failed = () => setIndex(current => current === index ? current + 1 : current);
  return <>
    {src && <img key={src} ref={image => { if (image?.complete && !image.naturalWidth) failed(); }} src={src} alt="" aria-hidden="true" referrerPolicy="no-referrer" className="pointer-events-none absolute inset-0 h-full w-full object-contain" onError={failed} />}
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/20" />
  </>;
}
