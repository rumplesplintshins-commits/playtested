import { gameplayVideo } from "./gameplay-video";
import { screenshotUrl, type GameScreenshot } from "./game-screenshots";

export function safePosterSource(value?: string | null): string | null {
  if (!value) return null;
  if (/^\/(?!\/)[^\\\s]*$/.test(value)) return value;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
export function videoPosterSources(id: string, videoUrl: string, screenshots: GameScreenshot[], catalogueThumbnail?: string | null, small = false): string[] {
  const sources: string[] = [];
  // Visitors never contact YouTube's thumbnail host: the authorised gateway
  // fetches only this video's fixed public thumbnail, cached on the server.
  if (!small && gameplayVideo(videoUrl)?.provider === "YouTube") sources.push(`/api/game-media/${encodeURIComponent(id)}/video-poster`);
  if (screenshots[0]) sources.push(screenshotUrl(id, screenshots[0], small));
  const fallback = safePosterSource(catalogueThumbnail);
  if (fallback) sources.push(fallback);
  return [...new Set(sources)];
}
