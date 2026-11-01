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
  '$1\n\n  const [imageUploading, setImageUploading] = useState(false);\n  const [description, setDescription] = useState("");\n  const [aiExplanation, setAiExplanation] = useState("");'
);

const uploadHandler = String.raw`$1

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      setError("Upload a JPG, PNG or WebP thumbnail.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Thumbnail images must be 5 MB or smaller.");
      return;
    }

    setImageUploading(true);
    setError("");
    setImageStatus("loading");

    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError("Sign in again before uploading a thumbnail.");
        setImageStatus("empty");
        return;
      }

      const extension = file.name.split(".").pop()?.toLowerCase() ||
        (file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg");
      const objectPath = user.id + "/" + crypto.randomUUID() + "." + extension;
      const { error: uploadError } = await supabase.storage
        .from("game-thumbnails")
        .upload(objectPath, file, { cacheControl: "3600", upsert: false, contentType: file.type });

      if (uploadError) {
        setError("Could not upload thumbnail: " + uploadError.message);
        setImageStatus("empty");
        return;
      }

      const { data } = supabase.storage.from("game-thumbnails").getPublicUrl(objectPath);
      setImageUrl(data.publicUrl);
      setImageStatus("loading");
    } catch (uploadError) {
      console.error("Unexpected thumbnail upload error:", uploadError);
      setError("Could not upload the thumbnail. Please try again.");
      setImageStatus("empty");
    } finally {
      setImageUploading(false);
    }
  }



  function openDatePicker`;
replaceOnce(
  "thumbnail upload handler",
  /(function handleImageChange\(event: ChangeEvent<HTMLInputElement>\) \{[\s\S]*?\n  \})\n\n\n\n  function openDatePicker/,
  uploadHandler
);

replaceOnce(
  "claim evidence label",
  /Verification evidence([\s\S]*?)Link to an official developer website, studio page,\s*publisher page or another source that helps verify\s*your relationship to the game\./,
  'Ownership evidence (optional)$1Link to something that helps confirm your connection to this game, such as your studio website, Steam developer page, publisher page or another public source.'
);

replaceOnce(
  "claim reason counter",
  /(<textarea\s+value=\{claimReason\}[\s\S]*?className=\{inputClass\}\s*\/>)(\s*<span className="mt-2 block text-xs leading-5 text-zinc-500">)/,
  '$1\n\n                        <span className="mt-2 block text-right text-xs text-zinc-500">\n                          {claimReason.length.toLocaleString()} / 1,000\n                        </span>$2'
);

const descriptionField = String.raw`<textarea
                  required
                  name="description"
                  rows={8}
                  maxLength={2000}
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    event.currentTarget.style.height = "auto";
                    event.currentTarget.style.height = Math.min(event.currentTarget.scrollHeight, 520) + "px";
                  }}
                  placeholder="Describe the gameplay, key features and what makes your game different."
                  className={inputClass + " min-h-48 resize-y overflow-y-auto"}
                />

                <span className="mt-2 block text-right text-xs text-zinc-500">
                  {description.length.toLocaleString()} / 2,000
                </span>`;
replaceOnce(
  "description field",
  /<textarea\s+required\s+name="description"[\s\S]*?className=\{inputClass\}\s*\/>/,
  descriptionField
);

const thumbnailStart = s.indexOf('              <div>\n\n                <label htmlFor="imageUrl"');
if (thumbnailStart < 0) throw new Error("Patch failed: thumbnail block start");
const thumbnailEndMarker = '\n\n            </section>\n\n\n\n            <div className="border-t border-white/10" />';
const thumbnailEnd = s.indexOf(thumbnailEndMarker, thumbnailStart);
if (thumbnailEnd < 0) throw new Error("Patch failed: thumbnail block end");
const thumbnailBlock = String.raw`              <div>
                <p className={labelClass}>Game thumbnail *</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Upload a JPG, PNG or WebP up to 5 MB, or paste a direct image URL. One thumbnail source is required.
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                  <label className={"inline-flex cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-[#101311] px-4 py-3 text-sm font-semibold text-zinc-200 hover:border-[#77f29b]/50 " + (imageUploading ? "pointer-events-none opacity-60" : "")}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={imageUploading}
                      onChange={handleImageUpload}
                    />
                    {imageUploading ? "Uploading..." : "Upload image"}
                  </label>
                  <span className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600 sm:text-left">or use an image URL</span>
                </div>

                <label htmlFor="imageUrl" className="mt-1 block">
                  <span className="sr-only">Game thumbnail image URL</span>
                  <input
                    id="imageUrl"
                    name="imageUrl"
                    type="url"
                    value={imageUrl}
                    onChange={handleImageChange}
                    placeholder="https://example.com/game-cover.jpg"
                    className={inputClass}
                  />
                </label>

                {imageUrl && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-[#101311] p-4">
                    <p className="mb-3 text-sm font-semibold text-zinc-300">Thumbnail preview</p>
                    {imageStatus === "loading" && <p className="text-sm text-amber-300">Checking image...</p>}
                    {imageStatus === "error" && <p className="text-sm text-red-300">Image failed to load. Check the URL or upload another image.</p>}
                    <img
                      key={imageUrl}
                      src={imageUrl}
                      alt="Game thumbnail preview"
                      className={"max-h-72 w-full rounded-lg object-contain " + (imageStatus === "error" ? "hidden" : "")}
                      onLoad={() => setImageStatus("loaded")}
                      onError={() => setImageStatus("error")}
                    />
                    {imageStatus === "loaded" && <p className="mt-3 text-sm text-[#77f29b]">Image ready.</p>}
                  </div>
                )}
              </div>`;
s = s.slice(0, thumbnailStart) + thumbnailBlock + s.slice(thumbnailEnd);

replaceOnce(
  "AI classification options",
  /<option value="AI-generated">[\s\S]*?<option value="No AI disclosed">[\s\S]*?<\/option>/,
  '<option value="AI-assisted: Code only">AI-assisted: Code only</option>\n\n                  <option value="AI-assisted: Content only">AI-assisted: Content only</option>\n\n                  <option value="AI-assisted: Code and content">AI-assisted: Code and content</option>\n\n                  <option value="No AI used">No AI used</option>'
);

const aiExplanationField = String.raw`<textarea
                  name="aiExplanation"
                  rows={6}
                  maxLength={2000}
                  value={aiExplanation}
                  onChange={(event) => {
                    setAiExplanation(event.target.value);
                    event.currentTarget.style.height = "auto";
                    event.currentTarget.style.height = Math.min(event.currentTarget.scrollHeight, 520) + "px";
                  }}
                  placeholder="Which tools were used, what did they produce, and how much was edited or created by humans?"
                  className={inputClass + " min-h-40 resize-y overflow-y-auto"}
                />

                <span className="mt-2 block text-right text-xs text-zinc-500">
                  {aiExplanation.length.toLocaleString()} / 2,000
                </span>`;
replaceOnce(
  "AI explanation field",
  /<textarea\s+name="aiExplanation"[\s\S]*?className=\{inputClass\}\s*\/>/,
  aiExplanationField
);

replaceOnce(
  "remove submission evidence field",
  /\n\n              <label className=\{labelClass\}>\s*Supporting evidence link \(optional\)[\s\S]*?<\/label>/,
  ""
);

replaceOnce(
  "reset controlled fields",
  /setImageUrl\(""\);setImageStatus\("empty"\);setReleaseStatus\(""\);form\.reset\(\);/,
  'setImageUrl("");setImageStatus("empty");setDescription("");setAiExplanation("");setReleaseStatus("");form.reset();'
);

fs.writeFileSync(path, s);
console.log("Patched app/submit/page.tsx successfully.");
