export type PlaytestReceptionRow = {
  playtest_id:string;
  accepted_test_count:number|string;
  rated_test_count:number|string;
  average_overall_score:number|string|null;
};
const safeCount=(x:number|string)=>{const n=Number(x);return Number.isFinite(n)&&n>0?n:0;};
/** Each accepted, scored report has equal weight, independent of its build. */
export function overallReceptionAcrossBuilds(
  buildIds: readonly string[], rows: readonly PlaytestReceptionRow[]
) {
  const ids=new Set(buildIds);
  let acceptedTests=0, ratedTests=0, weightedTotal=0;
  for (const row of rows) {
    if (!ids.has(row.playtest_id)) continue;
    acceptedTests+=safeCount(row.accepted_test_count);
    const count=safeCount(row.rated_test_count);
    const mean=row.average_overall_score===null?NaN:Number(row.average_overall_score);
    if(count&&Number.isFinite(mean)) {
      ratedTests+=count;
      weightedTotal+=count*mean;
    }
  }
  return {acceptedTests,ratedTests,rounds:ids.size,
    overallScore:ratedTests?Math.round(weightedTotal/ratedTests*10)/10:null};
}
