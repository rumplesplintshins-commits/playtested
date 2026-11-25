import { screenshotUrl, type GameScreenshot } from "./game-screenshots";

export function safePosterSource(value?: string | null): string | null {
  if (!value) return null;
  if (/^\\/(?!\\/)[^\\\\\\s]*$/.test(value)) return value;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
export function videoPosterSources(id: string, _videoUrl: string, screenshots: GameScreenshot[], catalogueThumbnail?: string | null, small = false): string[] {
  // Do not proxy third-party video thumbnails through Render on every page view.
  // Prefer the authorised screenshot delivery route, then the catalogue image.
  const sources: string[] = [];
  if (screenshots[0]) sources.push(screenshotUrl(id, screenshots[0], small));
  const fallback = safePosterSource(catalogueThumbnail);
  if (fallback) sources.push(fallback);
  return [...new Set(sources)];
}
