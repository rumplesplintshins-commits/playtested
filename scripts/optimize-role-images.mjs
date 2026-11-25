import { randomUUID } from "node:crypto";
import { rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const roleImages = [
  "public/images/roles/developer-role.png",
  "public/images/roles/tester-role.png",
];

async function renameWithRetry(source, target) {
  const retryableCodes = new Set(["EBUSY", "EPERM", "EACCES"]);
  const delays = [150, 300, 600, 1000, 1500, 2000];

  for (let attempt = 0; ; attempt += 1) {
    try {
      await rename(source, target);
      return;
    } catch (error) {
      if (!retryableCodes.has(error?.code) || attempt >= delays.length) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}

async function removeTemporaryFile(file) {
  const delays = [150, 300, 600, 1000, 1500];
  for (let attempt = 0; ; attempt += 1) {
    try {
      await rm(file, { force: true });
      return;
    } catch (error) {
      if (!["EBUSY", "EPERM", "EACCES"].includes(error?.code) || attempt >= delays.length) {
        console.warn(`Could not remove temporary image ${file}: ${error.message}`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}

async function convert(source) {
  const target = source.replace(/\.png$/i, ".webp");
  const original = await stat(source);
  const input = sharp(source, { failOn: "error" });
  const metadata = await input.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read dimensions for ${source}`);
  }

  // Validate the encoded buffer directly. Reopening a temporary WebP from disk
  // can trigger Windows file-sharing locks in antivirus and file-indexing tools.
  const output = await sharp(source, { failOn: "error" })
    .webp({ quality: 82, effort: 5, smartSubsample: true })
    .toBuffer();
  const outputMetadata = await sharp(output).metadata();
  if (outputMetadata.format !== "webp" ||
      outputMetadata.width !== metadata.width ||
      outputMetadata.height !== metadata.height) {
    throw new Error(`WebP validation failed for ${source}`);
  }
  if (output.length >= original.size) {
    throw new Error(`WebP did not reduce file size for ${source}; original retained`);
  }

  const temporary = path.join(
    path.dirname(target),
    `.${path.basename(target)}.${randomUUID()}.tmp.webp`,
  );
  await writeFile(temporary, output, { flag: "wx" });
  try {
    await renameWithRetry(temporary, target);
  } catch (error) {
    await removeTemporaryFile(temporary);
    throw new Error(
      `Could not replace ${target} after retrying. Close any process previewing or watching this image, then rerun the build. Original image retained.`,
      { cause: error },
    );
  }

  const saved = original.size - output.length;
  console.log(`${source} -> ${target}: ${original.size.toLocaleString()} -> ${output.length.toLocaleString()} bytes (quality 82, saved ${(saved / original.size * 100).toFixed(1)}%)`);
}

for (const file of roleImages) await convert(file);
