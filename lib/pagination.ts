export const boundedPageSize=(size:number)=>Math.max(1,Math.floor(size)||10);
export const pageCount=(total:number,size:number)=>Math.max(1,Math.ceil(Math.max(0,total)/boundedPageSize(size)));
export const safePage=(page:number,total:number,size:number)=>Math.min(pageCount(total,size),Math.max(1,Number.isFinite(page)?Math.floor(page):1));
export function pagedItems<T>(items:readonly T[],page:number,size:number):T[]{
 const start=(safePage(page,items.length,size)-1)*boundedPageSize(size);
 return items.slice(start,start+boundedPageSize(size));
}
export function pageNumbers(current:number,totalPages:number):Array<number|"…">{
 const last=Math.max(1,totalPages),at=Math.min(Math.max(current,1),last);
 const numbers=[1,at-1,at,at+1,last].filter(n=>n>=1&&n<=last).sort((a,b)=>a-b);
 const distinct=[...new Set(numbers)],out:Array<number|"…">=[];
 for(const number of distinct){const lastEntry=out[out.length-1];if(typeof lastEntry==="number"&&number-lastEntry>1)out.push("…");out.push(number);}
 return out;
}
