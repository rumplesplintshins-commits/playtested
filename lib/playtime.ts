export function summarizePlaytime(values: readonly (number | null | undefined)[]) {
  const hours = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0).sort((a, b) => a - b);
  const count = hours.length;
  const totalHours = count ? hours.reduce((sum, value) => sum + value, 0) : null;
  const averageHours = totalHours === null ? null : totalHours / count;
  const middle = Math.floor(count / 2);
  const medianHours = count ? (count % 2 ? hours[middle] : (hours[middle - 1] + hours[middle]) / 2) : null;
  return { count, totalHours, averageHours, medianHours };
}

export function comparePlaytime(hours: number | null, referenceMinutes: number | null) {
  if (hours === null || !Number.isFinite(hours) || hours < 0 || referenceMinutes === null || !Number.isFinite(referenceMinutes) || referenceMinutes <= 0) return null;
  const percentOfReference = hours * 60 / referenceMinutes * 100;
  return { percentOfReference, percentDifference: percentOfReference - 100 };
}

export function formatPlaytime(hours: number | null): string {
  if (hours === null) return "Not reported";
  const format = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
  return hours >= 1 ? `${format.format(hours)}h` : `${format.format(hours * 60)} min`;
}
