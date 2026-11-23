export type TesterGamePublication = {
  submission_id: string;
  published_at?: string | null;
};

export function sortTesterGamesOldestFirst<T extends TesterGamePublication>(games: readonly T[]): T[] {
  return [...games].sort((a, b) => {
    const publishedA = Date.parse(a.published_at ?? "");
    const publishedB = Date.parse(b.published_at ?? "");
    const hasDateA = Number.isFinite(publishedA);
    const hasDateB = Number.isFinite(publishedB);

    if (hasDateA && hasDateB && publishedA !== publishedB) return publishedA - publishedB;
    if (hasDateA !== hasDateB) return hasDateA ? -1 : 1;
    return a.submission_id.localeCompare(b.submission_id);
  });
}
