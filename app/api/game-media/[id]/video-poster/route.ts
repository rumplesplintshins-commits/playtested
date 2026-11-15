import sharp from "sharp";
import { createClient } from "@/lib/supabase-server";
import { gameplayVideo } from "@/lib/gameplay-video";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  const missing = () => new Response(null, { status: 404, headers });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return missing();
  const client = await createClient();
  const { data, error } = await client.from("gameplay_footage").select("video_url").eq("submission_id", id).maybeSingle();
  if (error || !data) return missing(); // Existing RLS: approved public or owner/admin.
  const video = gameplayVideo(data.video_url);
  if (video?.provider !== "YouTube") return missing();
  const videoId = new URL(video.url).searchParams.get("v")!;
  try {
    const response = await fetch(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, {
      redirect: "error", credentials: "omit", signal: AbortSignal.timeout(5000), next: { revalidate: 3600 },
    });
    if (!response.ok || !/^image\/(jpeg|png|webp)(?:;|$)/i.test(response.headers.get("content-type") || "")) return missing();
    const reader = response.body?.getReader(); if (!reader) return missing();
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const part = await reader.read(); if (part.done) break;
      length += part.value.length;
      if (length > 2097152) { await reader.cancel(); return missing(); }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const image = sharp(bytes, { limitInputPixels: 4000000, failOn: "warning" });
    const metadata = await image.metadata();
    // Missing YouTube thumbnails can be tiny generic placeholders.
    if (!["jpeg", "png", "webp"].includes(metadata.format || "") || (metadata.pages || 1) > 1 || !metadata.width || !metadata.height || metadata.width < 320 || metadata.height < 180) return missing();
    const encoded = await image.resize({ width: 1280, height: 720, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    return new Response(new Uint8Array(encoded), { headers: { ...headers, "Content-Type": "image/webp" } });
  } catch { return missing(); } // The browser falls back to the game's own media.
}
