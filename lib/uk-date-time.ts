export function ukDateTime(value:string|null|undefined){
 if(!value)return "Not recorded";
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return "Not recorded";
 return new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'}).format(date)+' (UK)';
}
