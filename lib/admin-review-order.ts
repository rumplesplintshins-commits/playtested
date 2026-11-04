type Review={id:string;status:string;submittedAt:string;reviewActivity?:string};
// Match the existing developer/admin action priority in submission-order.ts.
const priority:Record<string,number>={"Needs More Information":0,"Pending Review":1,Approved:2,Rejected:3};
export function compareAdminReview(a:Review,b:Review,filter:string){
 const group=filter==="All"||filter==="Needs attention"?(priority[a.status]??9)-(priority[b.status]??9):0;
 const activity=(row:Review)=>Date.parse(row.reviewActivity||row.submittedAt)||0;
 return group||activity(b)-activity(a)||a.id.localeCompare(b.id);
}
