import assert from "node:assert/strict";
import AdmZip from "adm-zip";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  extractPulseZipSafely,
  getPulseZipLimits,
  preflightPulseZip,
} from "../scripts/workers/pulse-zip-safety.mjs";

const temporaryDirectory = mkdtempSync(
  path.join(os.tmpdir(), "playtested-pulse-zip-extraction-")
);
const generousLimits = {
  maxArchiveBytes: 2 * 1024 * 1024,
  maxEntries: 100,
  maxEntryCompressedBytes: 1024 * 1024,
  maxEntryBytes: 1024 * 1024,
  maxExpandedBytes: 2 * 1024 * 1024,
  maxCompressionRatio: 1000,
};

function archivePath(name) {
  return path.join(temporaryDirectory, `${name}.zip`);
}

function outputPath(name) {
  return path.join(temporaryDirectory, `${name}-extracted`);
}

function makeArchive(name, entries, mutate) {
  const zip = new AdmZip();
  for (const fixture of entries) {
    const entry = zip.addFile(
      fixture.name,
      Buffer.from(fixture.content ?? "fixture", "utf8")
    );
    if (fixture.unixMode !== undefined) {
      entry.header.made = (entry.header.made & 0xff) | 0x0300;
      entry.attr = (fixture.unixMode << 16) >>> 0;
    }
    if (fixture.encrypted) {
      entry.header.flags |= 0x0001;
    }
    if (fixture.method !== undefined) {
      entry.header.method = fixture.method;
    }
  }
  mutate?.(zip);
  const target = archivePath(name);
  zip.writeZip(target);
  return target;
}

function patchEntryHeaders(zipPath, entryName, patch) {
  const buffer = readFileSync(zipPath);
  const name = Buffer.from(entryName, "utf8");
  let centralOffset = -1;
  for (let offset = 0; offset <= buffer.length - 46; offset += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) continue;
    const nameLength = buffer.readUInt16LE(offset + 28);
    if (
      nameLength === name.length &&
      buffer.subarray(offset + 46, offset + 46 + nameLength).equals(name)
    ) {
      centralOffset = offset;
      break;
    }
  }
  assert.notEqual(centralOffset, -1, `Central entry not found: ${entryName}`);

  const localOffset = buffer.readUInt32LE(centralOffset + 42);
  assert.equal(buffer.readUInt32LE(localOffset), 0x04034b50);
  patch({ buffer, centralOffset, localOffset });
  writeFileSync(zipPath, buffer);
}

function assertExtractionRejected(zipPath, name, limits = generousLimits, pattern) {
  const target = outputPath(name);
  assert.throws(
    () => extractPulseZipSafely(zipPath, target, limits),
    pattern
  );
  assert.equal(existsSync(target), false, "Rejected ZIP is never published.");
  assert.deepEqual(
    readdirSync(temporaryDirectory).filter((entry) =>
      entry.startsWith(`.${path.basename(target)}-stage-`)
    ),
    [],
    "Rejected extraction staging files are cleaned."
  );
}

try {
  const defaults = getPulseZipLimits({
    PULSE_ZIP_MAX_ENTRIES: "123",
    PULSE_ZIP_MAX_ENTRY_BYTES: "456",
    PULSE_ZIP_MAX_COMPRESSION_RATIO: "17",
  });
  assert.equal(defaults.maxEntries, 123);
  assert.equal(defaults.maxEntryBytes, 456);
  assert.equal(defaults.maxCompressionRatio, 17);
  assert.throws(
    () => getPulseZipLimits({ PULSE_ZIP_MAX_ENTRIES: "not-a-number" }),
    /must be a positive safe integer/
  );
  assert.throws(
    () => getPulseZipLimits({ PULSE_ZIP_MAX_ENTRY_BYTES: "0" }),
    /must be a positive safe integer/
  );

  let materializedEntries = false;
  assert.throws(
    () =>
      preflightPulseZip(
        {
          getEntryCount: () => 2,
          getEntries: () => {
            materializedEntries = true;
            throw new Error("must not materialize");
          },
        },
        { maxEntries: 1 }
      ),
    /entry-count limit/
  );
  assert.equal(
    materializedEntries,
    false,
    "Entry-count limit is checked before getEntries()."
  );

  const nestedZip = makeArchive("legitimate-nested", [
    { name: "index.html", content: "<!doctype html><script src=\"js/game.js\"></script>" },
    { name: "assets/logo.png", content: "png fixture" },
    { name: "js/game.js", content: "console.log('nested game');" },
    { name: "css/site.css", content: "body { margin: 0; }" },
  ]);
  const nestedOutput = outputPath("legitimate-nested");
  const extraction = extractPulseZipSafely(
    nestedZip,
    nestedOutput,
    generousLimits
  );
  assert.equal(extraction.entries, 4);
  assert.equal(
    extraction.expandedBytes,
    Buffer.byteLength(
      "<!doctype html><script src=\"js/game.js\"></script>" +
        "png fixture" +
        "console.log('nested game');" +
        "body { margin: 0; }"
    )
  );
  assert.equal(
    readFileSync(path.join(nestedOutput, "index.html"), "utf8"),
    "<!doctype html><script src=\"js/game.js\"></script>"
  );
  assert.equal(
    readFileSync(path.join(nestedOutput, "js", "game.js"), "utf8"),
    "console.log('nested game');"
  );

  const manyEntries = makeArchive("entry-count", [
    { name: "one.txt" },
    { name: "two.txt" },
    { name: "three.txt" },
  ]);
  assertExtractionRejected(
    manyEntries,
    "entry-count",
    { ...generousLimits, maxEntries: 2 },
    /entry-count limit/
  );

  const oversizedEntry = makeArchive("entry-size", [
    { name: "index.html", content: "123456789" },
  ]);
  assertExtractionRejected(
    oversizedEntry,
    "entry-size",
    { ...generousLimits, maxEntryBytes: 8 },
    /entry exceeds its configured size limit/
  );

  const oversizedCompressedEntry = makeArchive("compressed-entry-size", [
    { name: "bundle.bin", content: "Z".repeat(200) },
  ]);
  assertExtractionRejected(
    oversizedCompressedEntry,
    "compressed-entry-size",
    { ...generousLimits, maxEntryCompressedBytes: 1 },
    /entry exceeds its configured size limit/
  );

  const aggregateZip = makeArchive("aggregate-size", [
    { name: "one.txt", content: "12345" },
    { name: "two.txt", content: "67890" },
  ]);
  assertExtractionRejected(
    aggregateZip,
    "aggregate-size",
    { ...generousLimits, maxExpandedBytes: 9 },
    /aggregate size limit/
  );

  const ratioZip = makeArchive("compression-ratio", [
    { name: "index.html", content: "A".repeat(100_000) },
  ]);
  assertExtractionRejected(
    ratioZip,
    "compression-ratio",
    { ...generousLimits, maxCompressionRatio: 2 },
    /compression ratio/
  );

  for (const [fixtureName, entryName, message] of [
    ["traversal", "../escape.txt", /unsafe or non-portable entry path/],
    ["absolute", "/outside.txt", /absolute or UNC/],
    ["drive", "C:\\outside.txt", /absolute or UNC/],
    ["unc", "\\\\server\\share.txt", /absolute or UNC/],
  ]) {
    const maliciousPath = makeArchive(fixtureName, [
      { name: "safe.txt", content: "escape attempt" },
    ]);
    const zip = new AdmZip(maliciousPath);
    zip.getEntries()[0].entryName = entryName;
    zip.writeZip(maliciousPath);
    assertExtractionRejected(
      maliciousPath,
      fixtureName,
      generousLimits,
      message
    );
    assert.equal(
      existsSync(path.join(temporaryDirectory, "escape.txt")),
      false
    );
  }

  const duplicateZip = makeArchive("normalized-duplicate", [
    { name: "assets/game.js", content: "first" },
    { name: "assetsXgame.js", content: "second" },
  ]);
  const duplicateBuffer = readFileSync(duplicateZip);
  const alternateName = Buffer.from("assetsXgame.js", "utf8");
  let duplicateNameCount = 0;
  for (
    let offset = 0;
    offset <= duplicateBuffer.length - alternateName.length;
    offset += 1
  ) {
    if (
      !duplicateBuffer
        .subarray(offset, offset + alternateName.length)
        .equals(alternateName)
    ) {
      continue;
    }
    duplicateBuffer[offset + 6] = 0x5c;
    duplicateNameCount += 1;
  }
  assert.equal(duplicateNameCount, 2, "Both local and central names are patched.");
  writeFileSync(duplicateZip, duplicateBuffer);
  assertExtractionRejected(
    duplicateZip,
    "normalized-duplicate",
    generousLimits,
    /duplicate normalized entry paths/
  );

  const caseCollisionZip = makeArchive("case-collision", [
    { name: "Assets/Game.js", content: "first" },
    { name: "assets/game.js", content: "second" },
  ]);
  assertExtractionRejected(
    caseCollisionZip,
    "case-collision",
    generousLimits,
    /duplicate normalized entry paths/
  );

  const parentFileCollision = makeArchive("parent-file-collision", [
    { name: "assets", content: "file" },
    { name: "assets/game.js", content: "child" },
  ]);
  assertExtractionRejected(
    parentFileCollision,
    "parent-file-collision",
    generousLimits,
    /file\/directory path collision/
  );

  const symlinkZip = makeArchive("symlink", [
    {
      name: "link",
      content: "outside-target",
      unixMode: 0xa1ff,
    },
  ]);
  assertExtractionRejected(
    symlinkZip,
    "symlink",
    generousLimits,
    /symlink or unsupported entry type/
  );

  const unsupportedEntryTypeZip = makeArchive("unsupported-entry-type", [
    { name: "pipe", content: "", unixMode: 0x11a4 },
  ]);
  assertExtractionRejected(
    unsupportedEntryTypeZip,
    "unsupported-entry-type",
    generousLimits,
    /symlink or unsupported entry type/
  );

  const encryptedZip = makeArchive(
    "encrypted",
    [{ name: "secret.txt", content: "secret", encrypted: true }]
  );
  assertExtractionRejected(
    encryptedZip,
    "encrypted",
    generousLimits,
    /encrypted entry/
  );

  const unsupportedMethodZip = makeArchive(
    "unsupported-method",
    [{ name: "file.txt", content: "unsupported", method: 12 }]
  );
  assertExtractionRejected(
    unsupportedMethodZip,
    "unsupported-method",
    generousLimits,
    /unsupported compression method/
  );

  const forgedLargeSizeZip = makeArchive("forged-large-size", [
    { name: "file.txt", content: "small" },
  ]);
  patchEntryHeaders(forgedLargeSizeZip, "file.txt", ({ buffer, centralOffset, localOffset }) => {
    buffer.writeUInt32LE(9, centralOffset + 24);
    buffer.writeUInt32LE(9, localOffset + 22);
  });
  assertExtractionRejected(
    forgedLargeSizeZip,
    "forged-large-size",
    { ...generousLimits, maxEntryBytes: 8 },
    /entry exceeds its configured size limit/
  );

  const forgedSmallSizeZip = makeArchive("forged-small-size", [
    { name: "file.txt", content: "A".repeat(1024) },
  ]);
  patchEntryHeaders(forgedSmallSizeZip, "file.txt", ({ buffer, centralOffset, localOffset }) => {
    buffer.writeUInt32LE(4, centralOffset + 24);
    buffer.writeUInt32LE(4, localOffset + 22);
  });
  assertExtractionRejected(
    forgedSmallSizeZip,
    "forged-small-size",
    generousLimits,
    /invalid|output|size|larger|buffer|too large/i
  );

  const forgedStoredSizeZip = makeArchive(
    "forged-stored-size",
    [{ name: "file.txt", content: "actual stored bytes" }],
    (zip) => {
      zip.getEntries()[0].header.method = 0;
    }
  );
  patchEntryHeaders(
    forgedStoredSizeZip,
    "file.txt",
    ({ buffer, centralOffset, localOffset }) => {
      buffer.writeUInt32LE(4, centralOffset + 24);
      buffer.writeUInt32LE(4, localOffset + 22);
    }
  );
  assertExtractionRejected(
    forgedStoredSizeZip,
    "forged-stored-size",
    generousLimits,
    /entry data does not match its declared size/
  );

  const mismatchedLocalSizeZip = makeArchive("mismatched-local-size", [
    { name: "file.txt", content: "matching data" },
  ]);
  patchEntryHeaders(
    mismatchedLocalSizeZip,
    "file.txt",
    ({ buffer, localOffset }) => {
      buffer.writeUInt32LE(1, localOffset + 22);
    }
  );
  assertExtractionRejected(
    mismatchedLocalSizeZip,
    "mismatched-local-size",
    generousLimits,
    /local and central entry sizes do not match/
  );

  const archiveLimitZip = makeArchive("archive-limit", [
    { name: "file.txt", content: "a" },
  ]);
  assertExtractionRejected(
    archiveLimitZip,
    "archive-limit",
    { ...generousLimits, maxArchiveBytes: 1 },
    /compressed archive limit/
  );

  const noContentZip = makeArchive("invalid-config", [
    { name: "file.txt", content: "a" },
  ]);
  assertExtractionRejected(
    noContentZip,
    "invalid-config",
    { ...generousLimits, maxExpandedBytes: 0 },
    /positive safe integer/
  );

  console.log(
    "PASS PULSE ZIP extraction regressions: pre-materialization entry cap, size/ratio limits, traversal/absolute/UNC paths, normalized collisions, file-directory conflicts, symlinks and special entry types, encryption, unsupported methods, forged and mismatched sizes, staging cleanup, and legitimate nested browser build."
  );
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
