import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { analyticsService } from "@/lib/admin-server";
import { processScreenshot } from "@/lib/screenshot-processing";
import { SCREENSHOT_BYTES } from "@/lib/game-screenshots";
import { hasTrustedOrigin } from "@/lib/request-origin";

type Context = { params: Promise<{ id: string; slot: string }> };
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const reply = (error: string, status: number) => NextResponse.json({ error }, { status, headers });
function valid(id: string, slot: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) && /^[1-5]$/.test(slot); }
async function cleanup(client: NonNullable<ReturnType<typeof analyticsService>>) {
  const { data } = await client.from("game_screenshot_cleanup").select("object_path").order("queued_at").limit(20);
  for (const row of data || []) {
    const result = await client.storage.from("game-screenshots").remove([row.object_path, row.object_path.replace(/\.webp$/, ".thumb.webp")]);
    if (!result.error) await client.from("game_screenshot_cleanup").delete().eq("object_path", row.object_path);
  }
}
export async function GET(request: Request, context: Context) {
  const { id, slot } = await context.params;
  if (!valid(id, slot)) return reply("Media not found.", 404);
  const client = await createClient();
  let query = client.from("game_screenshots").select("slot,revision").eq("submission_id", id).eq("slot", Number(slot));
  const revision = new URL(request.url).searchParams.get("v");
  if (revision) { if (!/^[0-9a-f-]{36}$/i.test(revision)) return reply("Media not found.", 404); query = query.eq("revision", revision); }
  const visible = await query.maybeSingle();
  if (visible.error || !visible.data) return reply("Media not found.", 404);
  const service = analyticsService();
  if (!service) return reply("Screenshot temporarily unavailable.", 503);
  const result = await service.from("game_screenshots").select("object_path").eq("submission_id", id).eq("slot", Number(slot)).eq("revision", visible.data.revision).maybeSingle();
  if (result.error || !result.data) return reply("Media not found.", 404);
  const path = new URL(request.url).searchParams.get("thumb") === "1" ? result.data.object_path.replace(/\.webp$/, ".thumb.webp") : result.data.object_path;
  const file = await service.storage.from("game-screenshots").download(path);
  if (file.error || !file.data) return reply("Screenshot temporarily unavailable.", 503);
  return new Response(file.data, { headers: { ...headers, "Content-Type": "image/webp" } });
}
async function mutate(request: Request, context: Context, remove: boolean) {
  if (!hasTrustedOrigin(request)) return reply("Same-origin request required.", 403);
  const { id, slot } = await context.params;
  if (!valid(id, slot)) return reply("Choose screenshot slot 1 to 5.", 400);
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return reply("Sign in required.", 401);
  const owner = await client.from("game_submissions").select("developer_id").eq("id", id).maybeSingle();
  if (owner.error || owner.data?.developer_id !== user.id) return reply("Only the submission owner can manage screenshots.", 403);
  const service = analyticsService();
  if (!service) return reply("Screenshot storage is not configured.", 503);
  let path: string | null = null;
  if (!remove) {
    const type = request.headers.get("content-type") || "";
    if (!type.startsWith("multipart/form-data;")) return reply("Upload an image file.", 415);
    // Bound multipart input even when Content-Length is absent or forged.
    const reader = request.body?.getReader();
    if (!reader) return reply("Choose an image file.", 400);
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const part = await reader.read(); if (part.done) break;
      length += part.value.length;
      if (length > SCREENSHOT_BYTES + 65536) { await reader.cancel(); return reply("Screenshot must be 5 MB or smaller.", 413); }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let encoded: Awaited<ReturnType<typeof processScreenshot>>;
    try {
      const form = await new Response(bytes, { headers: { "Content-Type": type } }).formData();
      const file = form.get("file");
      if (!(file instanceof File)) return reply("Choose an image file.", 400);
      encoded = await processScreenshot(file);
    } catch (e) { return reply(e instanceof Error ? e.message : "Invalid screenshot.", 400); }
    path = `${user.id}/${id}/${crypto.randomUUID()}.webp`;
    const upload = await service.storage.from("game-screenshots").upload(path, encoded.image, { contentType: "image/webp", upsert: false });
    if (upload.error) return reply("Screenshot upload failed. Please retry.", 503);
    const thumbnail = await service.storage.from("game-screenshots").upload(path.replace(/\.webp$/, ".thumb.webp"), encoded.thumbnail, { contentType: "image/webp", upsert: false });
    if (thumbnail.error) {
      await service.from("game_screenshot_cleanup").upsert({ object_path: path });
      await cleanup(service);
      return reply("Screenshot upload failed. Please retry.", 503);
    }
  }
  const saved = await service.rpc("set_game_screenshot", { p_id: id, p_slot: Number(slot), p_path: path });
  if (saved.error) {
    if (path) {
      const removed = await service.storage.from("game-screenshots").remove([path,path.replace(/\.webp$/, ".thumb.webp")]);
      if (removed.error) await service.from("game_screenshot_cleanup").upsert({ object_path: path });
    }
    await cleanup(service);
    return reply("Screenshot could not be saved. Please retry.", 503);
  }
  await cleanup(service);
  return NextResponse.json({ saved: true }, { headers });
}
export async function PUT(request: Request, context: Context) { return mutate(request, context, false); }
export async function DELETE(request: Request, context: Context) { return mutate(request, context, true); }
