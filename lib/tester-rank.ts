// Presentation only: rank numbers and progression rules remain server-owned.
export const RANKS = ["Bronze", "Silver", "Gold", "Platinum"];
const styles = [
  {color:"#e7b181",text:"text-[#e7b181]",badge:"border-[#e7b181]/35 bg-[#e7b181]/[0.08] text-[#e7b181]"},
  {color:"#d4d9e2",text:"text-[#d4d9e2]",badge:"border-[#d4d9e2]/35 bg-[#d4d9e2]/[0.08] text-[#d4d9e2]"},
  {color:"#f1cf76",text:"text-[#f1cf76]",badge:"border-[#f1cf76]/35 bg-[#f1cf76]/[0.08] text-[#f1cf76]"},
  {color:"#bce5f5",text:"text-[#bce5f5]",badge:"border-[#bce5f5]/35 bg-[#bce5f5]/[0.08] text-[#bce5f5]"},
];
export function testerRankPresentation(rank:unknown){
 const known=typeof rank==="number"&&Number.isInteger(rank)&&rank>=0&&rank<RANKS.length;
 return known?{known:true,label:`${RANKS[rank]} Tester`,...styles[rank]}:{known:false,label:"Tester rank unavailable",color:"#d4d4d8",text:"text-zinc-300",badge:"border-white/20 bg-white/5 text-zinc-300"};
}
