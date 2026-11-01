import fs from "node:fs";

const path = "app/submit/page.tsx";
let s = fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");

const oldText = "Upload a JPG, PNG or WebP up to 5 MB, or paste a direct image URL. One thumbnail source is required.";
const newText = "Upload a JPG, PNG or WebP up to 5 MB, or paste a direct image URL. Recommended: 16:9, at least 1280 × 720. Other sizes may be cropped to fit.";

if (s.includes(newText)) {
  console.log("Thumbnail guidance is already up to date.");
  process.exit(0);
}

if (!s.includes(oldText)) {
  throw new Error("Patch failed: current thumbnail guidance was not found.");
}

s = s.replace(oldText, newText);
fs.writeFileSync(path, s);
console.log("Updated thumbnail guidance successfully.");
