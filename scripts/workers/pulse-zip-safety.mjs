import AdmZip from "adm-zip";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";

const MiB = 1024 * 1024;
const DEFAULT_LIMITS = Object.freeze({
  maxArchiveBytes: 500 * MiB,
  maxEntries: 10_000,
  maxEntryCompressedBytes: 256 * MiB,
  maxEntryBytes: 256 * MiB,
  maxExpandedBytes: 1024 * MiB,
  maxCompressionRatio: 200,
});

const LIMIT_ENV = Object.freeze({
  maxArchiveBytes: "PULSE_ZIP_MAX_ARCHIVE_BYTES",
  maxEntries: "PULSE_ZIP_MAX_ENTRIES",
  maxEntryCompressedBytes: "PULSE_ZIP_MAX_ENTRY_COMPRESSED_BYTES",
  maxEntryBytes: "PULSE_ZIP_MAX_ENTRY_BYTES",
  maxExpandedBytes: "PULSE_ZIP_MAX_EXPANDED_BYTES",
  maxCompressionRatio: "PULSE_ZIP_MAX_COMPRESSION_RATIO",
});

function readLimit(name, value, fallback) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive safe integer.`);
  }
  return parsed;
}

export function getPulseZipLimits(environment = process.env) {
  return Object.fromEntries(
    Object.entries(DEFAULT_LIMITS).map(([key, fallback]) => [
      key,
      readLimit(LIMIT_ENV[key], environment[LIMIT_ENV[key]], fallback),
    ])
  );
}

function validateLimits(limits) {
  for (const [key, fallback] of Object.entries(DEFAULT_LIMITS)) {
    const value = limits[key] ?? fallback;
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error(`${key} must be a positive safe integer.`);
    }
  }
}

function entryRelativePath(entry) {
  const original = entry.entryName;
  if (
    typeof original !== "string" ||
    original.length === 0 ||
    original.length > 4096 ||
    /[\u0000-\u001f\u007f]/.test(original)
  ) {
    throw new Error("ZIP contains an invalid entry path.");
  }

  const slashPath = original.replace(/\\/g, "/");
  if (entry.isDirectory === true && /\/{2,}$/.test(slashPath)) {
    throw new Error("ZIP contains an invalid directory path.");
  }
  if (
    slashPath.startsWith("/") ||
    /^[a-z]:/i.test(slashPath) ||
    slashPath.startsWith("//")
  ) {
    throw new Error("ZIP contains an absolute or UNC entry path.");
  }

  const isDirectory = entry.isDirectory === true;
  const pathWithoutTrailingSlash = isDirectory
    ? slashPath.replace(/\/+$/, "")
    : slashPath;
  const segments = pathWithoutTrailingSlash.split("/");
  if (
    segments.length === 0 ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        Buffer.byteLength(segment, "utf8") > 255 ||
        /[<>:"|?*]/.test(segment) ||
        /[. ]$/.test(segment) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment)
    )
  ) {
    throw new Error("ZIP contains an unsafe or non-portable entry path.");
  }

  return {
    relativePath: segments.join(sep),
    collisionKey: segments.join("/").normalize("NFC").toLocaleLowerCase("en-US"),
    segments,
    isDirectory,
  };
}

function validateEntryType(entry) {
  const header = entry.header;
  const flags = header.flags;
  if (header.encrypted || (flags & (0x0040 | 0x2000)) !== 0) {
    throw new Error("ZIP contains an encrypted entry.");
  }

  if (header.method !== 0 && header.method !== 8) {
    throw new Error("ZIP contains an unsupported compression method.");
  }

  const madeByPlatform = header.made >>> 8;
  const unixType = (header.attr >>> 16) & 0xf000;
  if (
    unixType === 0xa000 ||
    (unixType !== 0 &&
      unixType !== 0x8000 &&
      unixType !== 0x4000) ||
    (madeByPlatform === 3 &&
      ((unixType === 0x8000 && entry.isDirectory) ||
        (unixType === 0x4000 && !entry.isDirectory)))
  ) {
    throw new Error("ZIP contains a symlink or unsupported entry type.");
  }

  if (
    madeByPlatform !== 3 &&
    (header.attr & (0x0008 | 0x0040 | 0x0400)) !== 0
  ) {
    throw new Error("ZIP contains a device or reparse-point entry.");
  }
}

function validateEntrySizes(entry, limits, totals) {
  const { compressedSize, size } = entry.header;
  if (
    !Number.isSafeInteger(compressedSize) ||
    compressedSize < 0 ||
    !Number.isSafeInteger(size) ||
    size < 0
  ) {
    throw new Error("ZIP contains invalid entry sizes.");
  }

  if (
    compressedSize > limits.maxEntryCompressedBytes ||
    size > limits.maxEntryBytes
  ) {
    throw new Error("ZIP entry exceeds its configured size limit.");
  }

  if (entry.isDirectory && (compressedSize !== 0 || size !== 0)) {
    throw new Error("ZIP directory entry contains file data.");
  }

  if (!entry.isDirectory && size > 0 && compressedSize === 0) {
    throw new Error("ZIP entry has an invalid zero compressed size.");
  }

  const ratio = size === 0 ? 0 : size / Math.max(1, compressedSize);
  if (ratio > limits.maxCompressionRatio) {
    throw new Error("ZIP entry exceeds the configured compression ratio.");
  }

  totals.compressedBytes += compressedSize;
  totals.declaredExpandedBytes += size;
  if (
    totals.compressedBytes > limits.maxArchiveBytes ||
    totals.declaredExpandedBytes > limits.maxExpandedBytes
  ) {
    throw new Error("ZIP exceeds its configured aggregate size limit.");
  }
}

function rejectPathCollisions(entries) {
  const byPath = new Map();
  for (const item of entries) {
    if (byPath.has(item.collisionKey)) {
      throw new Error("ZIP contains duplicate normalized entry paths.");
    }
    byPath.set(item.collisionKey, item.isDirectory ? "directory" : "file");
  }

  for (const item of entries) {
    for (let index = 1; index < item.segments.length; index += 1) {
      const parent = item.segments
        .slice(0, index)
        .join("/")
        .normalize("NFC")
        .toLocaleLowerCase("en-US");
      if (byPath.get(parent) === "file") {
        throw new Error("ZIP contains a file/directory path collision.");
      }
    }
  }
}

export function preflightPulseZip(zip, limits = DEFAULT_LIMITS) {
  limits = { ...DEFAULT_LIMITS, ...limits };
  validateLimits(limits);

  const declaredEntryCount = zip.getEntryCount();
  if (
    !Number.isSafeInteger(declaredEntryCount) ||
    declaredEntryCount < 0 ||
    declaredEntryCount > limits.maxEntries
  ) {
    throw new Error("ZIP exceeds the configured entry-count limit.");
  }

  const rawEntries = zip.getEntries();
  if (rawEntries.length !== declaredEntryCount) {
    throw new Error("ZIP entry count does not match its directory.");
  }

  const totals = { compressedBytes: 0, declaredExpandedBytes: 0 };
  const entries = rawEntries.map((entry) => {
    if (!entry || !entry.header || typeof entry.getData !== "function") {
      throw new Error("ZIP contains an unsupported entry.");
    }
    const path = entryRelativePath(entry);
    validateEntryType(entry);
    validateEntrySizes(entry, limits, totals);
    return { entry, ...path };
  });

  rejectPathCollisions(entries);
  return { entries, totals };
}

function assertArchivePathSafe(root, target) {
  const rootPath = resolve(root);
  const targetPath = resolve(target);
  const pathFromRoot = relative(rootPath, targetPath);
  if (
    !pathFromRoot ||
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromRoot)
  ) {
    throw new Error("ZIP entry escaped its extraction directory.");
  }
}

function validateLocalHeader(entry) {
  const compressedData = entry.getCompressedData();
  const { compressedSize, flags, method, localHeader } = entry.header;
  if (
    compressedData.length !== compressedSize ||
    localHeader.method !== method ||
    (localHeader.flags & (0x0001 | 0x0040 | 0x2000)) !== 0
  ) {
    throw new Error("ZIP local and central entry headers do not match.");
  }

  if ((flags & 0x0008) === 0) {
    if (
      localHeader.compressedSize !== compressedSize ||
      localHeader.size !== entry.header.size
    ) {
      throw new Error("ZIP local and central entry sizes do not match.");
    }
  } else if (
    (localHeader.compressedSize !== 0 &&
      localHeader.compressedSize !== compressedSize) ||
    (localHeader.size !== 0 && localHeader.size !== entry.header.size)
  ) {
    throw new Error("ZIP data descriptor sizes do not match.");
  }

  return compressedData;
}

export function extractPulseZipSafely(
  zipPath,
  extractDirectory,
  limits = getPulseZipLimits()
) {
  limits = { ...DEFAULT_LIMITS, ...limits };
  validateLimits(limits);
  const archiveStat = statSync(zipPath);
  if (
    !archiveStat.isFile() ||
    archiveStat.size <= 0 ||
    archiveStat.size > limits.maxArchiveBytes
  ) {
    throw new Error("ZIP exceeds the configured compressed archive limit.");
  }

  if (existsSync(extractDirectory)) {
    throw new Error("ZIP extraction directory already exists.");
  }

  const zip = new AdmZip(zipPath);
  const { entries } = preflightPulseZip(zip, limits);
  const stageDirectory = mkdtempSync(
    resolve(dirname(extractDirectory), `.${basename(extractDirectory)}-stage-`)
  );

  let actualExpandedBytes = 0;
  try {
    for (const item of entries) {
      const target = resolve(stageDirectory, item.relativePath);
      assertArchivePathSafe(stageDirectory, target);
      if (item.isDirectory) {
        mkdirSync(target, { recursive: true, mode: 0o700 });
        continue;
      }

      validateLocalHeader(item.entry);
      const data = item.entry.getData();
      if (data.length !== item.entry.header.size) {
        throw new Error("ZIP entry data does not match its declared size.");
      }

      actualExpandedBytes += data.length;
      if (
        data.length > limits.maxEntryBytes ||
        actualExpandedBytes > limits.maxExpandedBytes
      ) {
        throw new Error("ZIP actual expanded data exceeds its configured limit.");
      }

      const actualRatio =
        data.length === 0
          ? 0
          : data.length / Math.max(1, item.entry.header.compressedSize);
      if (actualRatio > limits.maxCompressionRatio) {
        throw new Error("ZIP actual data exceeds its compression-ratio limit.");
      }

      mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
      writeFileSync(target, data, { flag: "wx", mode: 0o600 });
    }

    renameSync(stageDirectory, extractDirectory);
    return { entries: entries.length, expandedBytes: actualExpandedBytes };
  } catch (error) {
    rmSync(stageDirectory, { recursive: true, force: true });
    throw error;
  }
}

export const pulseZipSafetyTestHelpers = {
  DEFAULT_LIMITS,
  getPulseZipLimits,
  preflightPulseZip,
};
