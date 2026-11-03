// Display wording only: keep the persisted assessment statuses unchanged.
export function assessmentLabel(status:string|null|undefined){
 return status==="Verified"?"Independent assessment: checks complete":status==="Assessed"?"Independent assessment: partial":"Independent assessment: not completed";
}
export const disclosureExplanation="AI use is declared by the developer. Review does not independently prove how the game was made.";
