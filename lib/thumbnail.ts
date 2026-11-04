export function isHostedThumbnail(value: string): boolean {
  try {
    const url = new URL(value);
    return url.origin === new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin && url.pathname.startsWith("/storage/v1/object/public/game-thumbnails/");
  } catch { return false; }
}

export async function thumbnailExtension(file: File): Promise<"jpg" | "png" | "webp"> {
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error("Choose a non-empty image no larger than 5 MB.");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  if (file.type === "image/png" && [137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v)) return "png";
  if (file.type === "image/webp" && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP") return "webp";
  throw new Error("The file contents must match a JPG, PNG or WebP image.");
}
