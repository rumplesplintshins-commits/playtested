import fs from "node:fs";

const path = "app/submit/page.tsx";
let s = fs.readFileSync(path, "utf8");

function replaceOnce(label, pattern, replacement) {
  const before = s;
  s = s.replace(pattern, replacement);
  if (s === before) throw new Error(`Patch failed: ${label}`);
}

replaceOnce(
  "submission UX state",
  /(const \[imageStatus, setImageStatus\][\s\S]*?useState<ImageStatus>\("empty"\);)/,
  `$1\n\n  const [imageUploading, setImageUploading] = useState(false);\n  const [description, setDescription] = useState("");\n  const [aiExplanation, setAiExplanation] = useState("");`
);

replaceOnce(
  "thumbnail upload handler",
  /(function handleImageChange\(event: ChangeEvent<HTMLInputElement>\) \{[\s\S]*?\n  \})\n\n\n\n  function openDatePicker/,
  `$1\n\n  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {\n    const file = event.target.files?.[0];\n    event.target.value = "";\n    if (!file) return;\n\n    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);\n    if (!allowedTypes.has(file.type)) {\n      setError("Upload a JPG, PNG or WebP thumbnail.");\n      return;\n    }\n    if (file.size > 5 * 1024 * 1024) {\n      setError("Thumbnail images must be 5 MB or smaller.");\n      return;\n    }\n\n    setImageUploading(true);\n    setError("");\n    setImageStatus("loading");\n\n    try {\n      const supabase = createClient();\n      const { data: { user }, error: authError } = await supabase.auth.getUser();\n      if (authError || !user) {\n        setError("Sign in again before uploading a thumbnail.");\n        setImageStatus("empty");\n        return;\n      }\n\n      const extension = file.name.split(".").pop()?.toLowerCase() ||\n        (file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg");\n      const objectPath = \\`\\${user.id}/\\${crypto.randomUUID()}.\\${extension}\\`;\n      const { error: uploadError } = await supabase.storage\n        .from("game-thumbnails")\n        .upload(objectPath, file, { cacheControl: "3600", upsert: false, contentType: file.type });\n\n      if (uploadError) {\n        setError(\\`Could not upload thumbnail: \\${uploadError.message}\\`);\n        setImageStatus("empty");\n        return;\n      }\n\n      const { data } = supabase.storage.from("game-thumbnails").getPublicUrl(objectPath);\n      setImageUrl(data.publicUrl);\n      setImageStatus("loading");\n    } catch (uploadError) {\n      console.error("Unexpected thumbnail upload error:", uploadError);\n      setError("Could not upload the thumbnail. Please try again.");\n      setImageStatus("empty");\n    } finally {\n      setImageUploading(false);\n    }\n  }\n\n\n\n  function openDatePicker`
);

replaceOnce(
  "claim evidence label",
  /Verification evidence([\s\S]*?)Link to an official developer website, studio page,\s*publisher page or another source that helps verify\s*your relationship to the game\./,
  `Ownership evidence (optional)$1Link to something that helps confirm your connection to this game, such as your studio website, Steam developer page, publisher page or another public source.`
);

replaceOnce(
  "claim reason counter",
  /(<textarea\s+value=\{claimReason\}[\s\S]*?className=\{inputClass\}\s*\/>)(\s*<span className="mt-2 block text-xs leading-5 text-zinc-500">)/,
  `$1\n\n                        <span className="mt-2 block text-right text-xs text-zinc-500">\n                          {claimReason.length.toLocaleString()} / 1,000\n                        </span>$2`
);

replaceOnce(
  "description field",
  /<textarea\s+required\s+name="description"[\s\S]*?className=\{inputClass\}\s*\/>/,
  `<textarea\n                  required\n                  name="description"\n                  rows={8}\n                  maxLength={2000}\n                  value={description}\n                  onChange={(event) => {\n                    setDescription(event.target.value);\n                    event.currentTarget.style.height = "auto";\n                    event.currentTarget.style.height = \\`\\${Math.min(event.currentTarget.scrollHeight, 520)}px\\`;\n                  }}\n                  placeholder="Describe the gameplay, key features and what makes your game different."\n                  className={\\`\\${inputClass} min-h-48 resize-y overflow-y-auto\\`}\n                />\n\n                <span className="mt-2 block text-right text-xs text-zinc-500">\n                  {description.length.toLocaleString()} / 2,000\n                </span>`
);

const thumbnailStart = s.indexOf('              <div>\n\n                <label htmlFor="imageUrl"');
if (thumbnailStart < 0) throw new Error("Patch failed: thumbnail block start");
const thumbnailEndMarker = '\n\n            </section>\n\n\n\n            <div className="border-t border-white/10" />';
const thumbnailEnd = s.indexOf(thumbnailEndMarker, thumbnailStart);
if (thumbnailEnd < 0) throw new Error("Patch failed: thumbnail block end");
const thumbnailBlock = `              <div>\n                <p className={labelClass}>Game thumbnail *</p>\n                <p className="mt-2 text-xs leading-5 text-zinc-500">\n                  Upload a JPG, PNG or WebP up to 5 MB, or paste a direct image URL. One thumbnail source is required.\n                </p>\n\n                <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">\n                  <label className={\\`inline-flex cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-[#101311] px-4 py-3 text-sm font-semibold text-zinc-200 hover:border-[#77f29b]/50 \\${imageUploading ? "pointer-events-none opacity-60" : ""}\\`}>\n                    <input\n                      type="file"\n                      accept="image/jpeg,image/png,image/webp"\n                      className="sr-only"\n                      disabled={imageUploading}\n                      onChange={handleImageUpload}\n                    />\n                    {imageUploading ? "Uploading..." : "Upload image"}\n                  </label>\n                  <span className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600 sm:text-left">or use an image URL</span>\n                </div>\n\n                <label htmlFor="imageUrl" className="mt-1 block">\n                  <span className="sr-only">Game thumbnail image URL</span>\n                  <input\n                    id="imageUrl"\n                    name="imageUrl"\n                    type="url"\n                    value={imageUrl}\n                    onChange={handleImageChange}\n                    placeholder="https://example.com/game-cover.jpg"\n                    className={inputClass}\n                  />\n                </label>\n\n                {imageUrl && (\n                  <div className="mt-4 rounded-xl border border-white/10 bg-[#101311] p-4">\n                    <p className="mb-3 text-sm font-semibold text-zinc-300">Thumbnail preview</p>\n                    {imageStatus === "loading" && <p className="text-sm text-amber-300">Checking image...</p>}\n                    {imageStatus === "error" && <p className="text-sm text-red-300">Image failed to load. Check the URL or upload another image.</p>}\n                    <img\n                      key={imageUrl}\n                      src={imageUrl}\n                      alt="Game thumbnail preview"\n                      className={\\`max-h-72 w-full rounded-lg object-contain \\${imageStatus === "error" ? "hidden" : ""}\\`}\n                      onLoad={() => setImageStatus("loaded")}\n                      onError={() => setImageStatus("error")}\n                    />\n                    {imageStatus === "loaded" && <p className="mt-3 text-sm text-[#77f29b]">Image ready.</p>}\n                  </div>\n                )}\n              </div>`;
s = s.slice(0, thumbnailStart) + thumbnailBlock + s.slice(thumbnailEnd);

replaceOnce(
  "AI classification options",
  /<option value="AI-generated">[\s\S]*?<option value="No AI disclosed">[\s\S]*?<\/option>/,
  `<option value="AI-assisted: Code only">AI-assisted: Code only</option>\n\n                  <option value="AI-assisted: Content only">AI-assisted: Content only</option>\n\n                  <option value="AI-assisted: Code and content">AI-assisted: Code and content</option>\n\n                  <option value="No AI used">No AI used</option>`
);

replaceOnce(
  "AI explanation field",
  /<textarea\s+name="aiExplanation"[\s\S]*?className=\{inputClass\}\s*\/>/,
  `<textarea\n                  name="aiExplanation"\n                  rows={6}\n                  maxLength={2000}\n                  value={aiExplanation}\n                  onChange={(event) => {\n                    setAiExplanation(event.target.value);\n                    event.currentTarget.style.height = "auto";\n                    event.currentTarget.style.height = \\`\\${Math.min(event.currentTarget.scrollHeight, 520)}px\\`;\n                  }}\n                  placeholder="Which tools were used, what did they produce, and how much was edited or created by humans?"\n                  className={\\`\\${inputClass} min-h-40 resize-y overflow-y-auto\\`}\n                />\n\n                <span className="mt-2 block text-right text-xs text-zinc-500">\n                  {aiExplanation.length.toLocaleString()} / 2,000\n                </span>`
);

replaceOnce(
  "remove submission evidence field",
  /\n\n              <label className=\{labelClass\}>\s*Supporting evidence link \(optional\)[\s\S]*?<\/label>/,
  ""
);

replaceOnce(
  "reset controlled fields",
  /setImageUrl\(""\);setImageStatus\("empty"\);setReleaseStatus\(""\);form\.reset\(\);/,
  `setImageUrl("");setImageStatus("empty");setDescription("");setAiExplanation("");setReleaseStatus("");form.reset();`
);

fs.writeFileSync(path, s);
console.log("Patched app/submit/page.tsx successfully.");
