import { rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const roleImages = [
  "public/images/roles/developer-role.png",
  "public/images/roles/tester-role.png",
];

async function convert(source) {
  const target = source.replace(/\\.png$/i, ".webp");
  const original = await stat(source);
  const metadata = await sharp(source, { failOn: "error" }).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read dimensions for ${source}`);
  }

  let chosen = null;
  for (const quality of [82, 76, 70]) {
    const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${process.pid}.${quality}.tmp.webp`);
    try {
      await sharp(source, { failOn: "error" })
        .webp({ quality, effort: 5, smartSubsample: true })
        .toFile(temporary);
      const result = await stat(temporary);
      const outputMetadata = await sharp(temporary).metadata();
      if (outputMetadata.format !== "webp" ||
          outputMetadata.width !== metadata.width ||
          outputMetadata.height !== metadata.height) {
        throw new Error(`WebP validation failed for ${source}`);
      }
      if (!chosen || result.size < chosen.size) {
        if (chosen) await rm(chosen.temporary, { force: true });
        chosen = { temporary, size: result.size, quality };
      } else {
        await rm(temporary, { force: true });
      }
      if (chosen.size < original.size * 0.8) break;
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
  }

  if (!chosen || chosen.size >= original.size) {
    if (chosen) await rm(chosen.temporary, { force: true });
    throw new Error(`WebP did not reduce file size for ${source}; original retained`);
  }
  await rename(chosen.temporary, target);
  const saved = original.size - chosen.size;
  console.log(`${source} -> ${target}: ${original.size.toLocaleString()} -> ${chosen.size.toLocaleString()} bytes (quality ${chosen.quality}, saved ${(saved / original.size * 100).toFixed(1)}%)`);
}

for (const file of roleImages) await convert(file);
