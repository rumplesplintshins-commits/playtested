export const FEEDBACK_QUALITY_CRITERIA = {
 specific:{label:"Specific observations about the build",guidance:"Names a concrete feature, interaction or behaviour in this build."},
 examples:{label:"Concrete examples supporting observations",guidance:"Gives a situation, example or reproduction detail; finding a bug is not required."},
 impact:{label:"Explains why something worked or caused difficulty",guidance:"Explains the effect on the testing experience, beyond a rating or preference."},
 focus:{label:"Addresses the requested testing task or focus areas",guidance:"Engages with the developer task; balanced feedback is valid when no focus is set."},
 takeaway:{label:"Provides a useful takeaway",guidance:"Identifies a priority, improvement or something worth preserving; criticism is not required."},
};
export type FeedbackQualityRecord={status?:string;quality_rubric_version?:number|null;feedback_quality_score?:number|null;base_xp_amount?:number|null;quality_reviewed?:boolean;review_outcome?:string;quality_criteria?:Record<string,boolean>|null;quality_eligibility?:Record<string,boolean>|null};
export function feedbackQualityLabel(report:FeedbackQualityRecord){
 if(["claimed","in_progress","expired"].includes(report.status||""))return "Feedback not submitted ? no quality assessment";
 if(report.quality_rubric_version!=null&&report.feedback_quality_score!=null)return `Feedback quality ${report.feedback_quality_score}% · ${report.base_xp_amount??"Unknown"} XP`;
 if(report.review_outcome==="pending")return "Feedback quality awaiting review";
 return `Legacy award: ${report.base_xp_amount??"unknown"} XP · quality score not recorded`;
}
export function feedbackReasonSuggestion(scores:Record<string,boolean>,eligibility:Record<string,boolean|null>){
 if(Object.values(eligibility).some(value=>value===null))return "Complete the originality and relevance assessment, then explain your decision.";
 if(!eligibility.original||!eligibility.relevant)return `Rejected with 0 XP: ${!eligibility.original?"the report did not meet the credible original/non-spam requirement":"the report did not relate to the relevant game/build and testing experience"}. Explain the observed evidence for this decision.`;
 const unmet=Object.entries(FEEDBACK_QUALITY_CRITERIA).filter(([key])=>!scores[key]).map(([,criterion])=>criterion.label.toLowerCase());
 return unmet.length?`Accepted with partial or zero XP. To make future feedback more useful: ${unmet.join("; ")}.` : "Accepted: specific observations, supporting examples, impact, testing focus and a useful takeaway were present.";
}
export type FeedbackReviewItem = {
  context: { title: string; build: string | null; instructions: string | null; focus_areas: string[] } | null;
  report: FeedbackQualityRecord & {
    id: string;
    tester_id: string;
    status: string;
    review_outcome: string;
    review_reason: string | null;
    xp_awarded: boolean;
    replacement_at: string | null;
    overall_score: number | null;
    gameplay_score: number | null;
    performance_score: number | null;
    enjoyed_most: string | null;
    frustrations: string | null;
    biggest_improvement: string | null;
    bugs_found: string | null;
    feedback: string | null;
    hours_played?: number | null;
    continue_playing?: string | null;
    recommend_game?: string | null;
    focus_responses?: Record<string, unknown> | null;
  };
  events: { id: number; kind: string; reason: string; xp_delta: number;rubric_version?:number|null;quality_score?:number|null;actual_xp_award?:number|null;actor_id?:string;created_at?:string }[] | null;
  developer_signals: { signal: string; reason: string }[] | null;
};

export function needsFeedbackReview(item: FeedbackReviewItem): boolean {
  if (item.report.review_outcome === "pending") return true;
  const events = item.events || [];
  const request = Math.max(0, ...events.filter(e => e.kind === "reconsideration").map(e => Number(e.id)));
  const decision = Math.max(0, ...events.filter(e => e.kind === "accepted" || e.kind === "rejected").map(e => Number(e.id)));
  return request > decision;
}
