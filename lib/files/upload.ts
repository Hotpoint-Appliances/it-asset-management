import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ATTACHMENT_TYPES = new Set([...IMAGE_TYPES, "application/pdf"]);
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export class UploadValidationError extends Error {}

function basePath(): string {
  const base = process.env.ASSET_FILES_BASE_PATH;
  if (!base) {
    throw new Error(
      "ASSET_FILES_BASE_PATH is not set. Copy .env.example to .env.local and fill it in.",
    );
  }
  return base;
}

function assertValidFile(file: File, allowed: Set<string>, maxBytes: number): void {
  if (!allowed.has(file.type)) {
    throw new UploadValidationError(`Unsupported file type: ${file.type || "unknown"}`);
  }
  if (file.size > maxBytes) {
    throw new UploadValidationError(`File too large (max ${Math.round(maxBytes / 1024 / 1024)}MB)`);
  }
}

export function assertValidImage(file: File): void {
  assertValidFile(file, IMAGE_TYPES, MAX_IMAGE_BYTES);
}

export function assertValidAttachment(file: File): void {
  assertValidFile(file, ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES);
}

/** Writes `file` under `ASSET_FILES_BASE_PATH/<subdir>/<generated-name>` and returns the path
 * relative to the base — that's what gets stored in the DB, never an absolute path (see
 * itam-conventions' ASSET_FILES_BASE_PATH rule). */
async function writeUploadedFile(
  file: File,
  subdir: string,
  allowed: Set<string>,
  maxBytes: number,
): Promise<{ relativePath: string; fileName: string }> {
  assertValidFile(file, allowed, maxBytes);
  const ext = path.extname(file.name);
  const generatedName = `${crypto.randomUUID()}${ext}`;
  const relativePath = `${subdir}/${generatedName}`;
  await mkdir(path.join(basePath(), subdir), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(basePath(), relativePath), buffer);
  return { relativePath, fileName: generatedName };
}

export function saveAssetImage(assetId: string, file: File) {
  return writeUploadedFile(file, `assets/${assetId}`, IMAGE_TYPES, MAX_IMAGE_BYTES);
}

export function saveAssetAttachment(assetId: string, file: File) {
  return writeUploadedFile(file, `assets/${assetId}/attachments`, ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES);
}

/** Best-effort delete — a missing file (already removed, or never written) is not an error. */
export async function deleteUploadedFile(relativePath: string): Promise<void> {
  try {
    await unlink(path.join(basePath(), relativePath));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

export function resolveUploadedFilePath(relativePath: string): string {
  return path.join(basePath(), relativePath);
}

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export function mimeTypeForPath(filePath: string): string {
  return MIME_BY_EXT[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}
