import { thumbnailExtension } from "./thumbnail";
export const SCREENSHOT_LIMIT = 5;
export const SCREENSHOT_BYTES = 5 * 1024 * 1024;
export const SCREENSHOT_PIXELS = 25000000;
export type GameScreenshot = { slot: number; revision: string };
export function screenshotUrl(id: string, shot: GameScreenshot, thumbnail = false) {
  return `/api/game-media/${encodeURIComponent(id)}/${shot.slot}?v=${encodeURIComponent(shot.revision)}${thumbnail ? "&thumb=1" : ""}`;
}
export async function validateScreenshot(file: File) {
  await thumbnailExtension(file);
  let image: ImageBitmap;
  try { image = await createImageBitmap(file); } catch { throw new Error("This image could not be decoded. Choose a valid JPG, PNG or WebP."); }
  try {
    if (image.width > 8192 || image.height > 8192 || image.width * image.height > SCREENSHOT_PIXELS) throw new Error("Screenshots must be at most 8192 pixels per side and 25 megapixels.");
    return image.width*image.height;
  } finally { image.close(); }
}
