import {NextResponse} from "next/server";

// Journey attribution is intentionally disabled while the privacy/PECR design is reviewed.
// Keep this endpoint as an inert compatibility route so older clients cannot create new
// visit, context or access records while ordinary share destinations continue to work.
export async function POST(){
 return NextResponse.json(
  {disabled:true},
  {status:410,headers:{"Cache-Control":"no-store"}},
 );
}
