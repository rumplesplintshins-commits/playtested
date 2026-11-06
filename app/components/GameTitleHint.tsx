import {gameTitleLength,gameTitleError} from "@/lib/submission-completeness";
export default function GameTitleHint({value,previous,id}:{value:string;previous?:string;id:string}){
 const error=gameTitleError(value,previous),count=gameTitleLength(value);
 return <p id={id} aria-live="polite" className={`mt-2 text-sm ${error?"text-amber-200":"text-zinc-400"}`}>{count} / 60 characters. {error||(count>60?"Existing longer title retained; a changed title must be 60 characters or fewer.":"Surrounding whitespace is excluded. Your title is never automatically shortened.")}</p>;
}
