import { ImageResponse } from "next/og";

export function GET() {
  return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",padding:80,background:"#090b0a",color:"#f1f4f1",borderLeft:"18px solid #77f29b"}}>
    <div style={{display:"flex",fontSize:32,color:"#77f29b",marginBottom:44}}>PLAYTESTED_</div>
    <div style={{display:"flex",fontSize:74,fontWeight:700}}>Playtest indie games.</div>
    <div style={{display:"flex",fontSize:74,fontWeight:700,color:"#77f29b"}}>Find playtesters.</div>
    <div style={{display:"flex",fontSize:28,marginTop:36,color:"#a1a1aa"}}>Practical playtesting and player feedback</div>
  </div>, {width:1200,height:630,headers:{"Cache-Control":"public, max-age=86400"}});
}
