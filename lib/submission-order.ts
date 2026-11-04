type SubmissionActivity = { id: string; status: string; updated_at?: string | null; submitted_at: string };
const priority: Record<string, number> = { "Needs More Information": 0, "Pending Review": 1, Approved: 2, Rejected: 3 };
const activity = (row: SubmissionActivity) => Date.parse(row.updated_at || row.submitted_at) || 0;
export function compareSubmissions(a: SubmissionActivity, b: SubmissionActivity): number {
  return (priority[a.status] ?? 4) - (priority[b.status] ?? 4) || activity(b) - activity(a) || a.id.localeCompare(b.id);
}
