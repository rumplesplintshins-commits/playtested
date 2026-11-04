import sharp from "sharp";
import { SCREENSHOT_BYTES, SCREENSHOT_PIXELS } from "./game-screenshots";

export async function processScreenshot(file: File): Promise<{ image: Uint8Array; thumbnail: Uint8Array }> {
  if (!file.size || file.size > SCREENSHOT_BYTES) throw new Error("Choose a non-empty screenshot up to 5 MB.");
  const formats: Record<string, string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
  if (!formats[file.type]) throw new Error("Choose a JPG, PNG or WebP screenshot.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const image = sharp(bytes, { limitInputPixels: SCREENSHOT_PIXELS, failOn: "warning", animated: true });
    const metadata = await image.metadata();
    if (metadata.format !== formats[file.type] || (metadata.pages || 1) !== 1 || !metadata.width || !metadata.height || metadata.width > 8192 || metadata.height > 8192) throw new Error();
    // Decode all pixels, apply orientation and discard metadata. Never crop.
    const output = await image.clone().rotate().webp({ quality: 90 }).toBuffer();
    if (output.length > SCREENSHOT_BYTES) throw new Error();
    const thumbnail = await image.clone().rotate().resize({ width: 320, height: 180, fit: "inside", withoutEnlargement: true }).webp({ quality: 75 }).toBuffer();
    return { image: new Uint8Array(output), thumbnail: new Uint8Array(thumbnail) };
  } catch { throw new Error("Screenshot contents are invalid, animated, too large or do not match the file type. Use a static JPG, PNG or WebP up to 5 MB and 25 megapixels."); }
}
