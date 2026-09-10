import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

/**
 * Local asset storage helpers.
 *
 * Uploaded images are persisted under `public/uploads/{avatars|news|feed}` and are
 * served by Next.js at the matching `/uploads/...` public route. The database
 * only keeps the bare filename; URL prefixing is the presentation layer's job.
 */

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

/** Maximum attached images per feed post (shared with the React compose UI). */
export const MAX_FEED_IMAGES = 8;

export const AVATAR_DIR = path.join(UPLOAD_ROOT, "avatars");
export const NEWS_COVER_DIR = path.join(UPLOAD_ROOT, "news");
export const FEED_MEDIA_DIR = path.join(UPLOAD_ROOT, "feed");

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/**
 * SVG is intentionally NOT accepted for uploads.
 *
 * Uploaded files are served straight from `public/uploads/...`, so an SVG would
 * be delivered same-origin as `image/svg+xml` and its embedded scripts would run
 * with the app's privileges the moment the file URL is opened directly (classic
 * stored-XSS). Raster formats below are decoded as pixels, never executed.
 */
const ACCEPTED_IMAGE_MIME = new Set(Object.keys(MIME_TO_EXT));

export function isAcceptedImage(mime: string): boolean {
  return ACCEPTED_IMAGE_MIME.has(mime);
}

export function extensionForMime(mime: string): string | null {
  return MIME_TO_EXT[mime] ?? null;
}

export function base64ExtensionForPrefix(mimePrefix: string): string | null {
  return MIME_TO_EXT[mimePrefix] ?? null;
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

function randomFilename(prefix: string, ext: string): string {
  return `${prefix}-${randomUUID()}.${ext}`;
}

/** Persist raw bytes to disk under `dir` and return the bare stored filename. */
export async function saveRawImage(
  data: ArrayBuffer,
  mime: string,
  prefix: string,
  dir: string,
): Promise<string | null> {
  if (!isAcceptedImage(mime)) return null;
  await ensureDir(dir);
  const ext = extensionForMime(mime);
  if (!ext) return null;
  const filename = randomFilename(prefix, ext);
  await writeFile(path.join(dir, filename), Buffer.from(data));
  return filename;
}

/**
 * Persist an image that arrives as a data-URL (base64 embedded string). Returns
 * the stored bare filename or null when the value is empty/unsupported.
 */
export async function saveBase64Image(
  dataUrl: string,
  prefix: string,
  dir: string,
): Promise<string | null> {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) return null;
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) return null;

  const meta = dataUrl.slice(5, commaIndex); // image/png;base64
  const mime = meta.split(";")[0];
  if (!isAcceptedImage(mime)) return null;

  const base64 = dataUrl.slice(commaIndex + 1);
  const ext = extensionForMime(mime);
  if (!ext) return null;

  await ensureDir(dir);
  const filename = randomFilename(prefix, ext);
  await writeFile(path.join(dir, filename), Buffer.from(base64, "base64"));
  return filename;
}

/** Best-effort removal of an old stored image (ignored when missing). */
export async function removeStoredImage(
  folder: "avatars" | "news" | "feed",
  filename?: string | null,
): Promise<void> {
  if (!filename) return;
  const base = path.basename(filename);
  if (base !== filename || filename.includes("..")) return; // reject traversal
  const dir =
    folder === "avatars"
      ? AVATAR_DIR
      : folder === "news"
        ? NEWS_COVER_DIR
        : FEED_MEDIA_DIR;
  try {
    await unlink(path.join(dir, filename));
  } catch {
    /* file likely already gone */
  }
}

export async function deleteStoredAvatar(filename?: string | null) {
  return removeStoredImage("avatars", filename);
}

export async function deleteStoredNewsCover(filename?: string | null) {
  return removeStoredImage("news", filename);
}

export async function deleteStoredFeedImage(filename?: string | null) {
  return removeStoredImage("feed", filename);
}

export { ensureDir };
