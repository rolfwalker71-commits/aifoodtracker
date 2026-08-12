import { randomUUID } from "crypto";
import { access, mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

export function getUploadDir() {
  return (
    process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads")
  );
}

export function toPublicMediaPath(filename: string) {
  return `/api/media/${filename}`;
}

/** Resolve a stored image path to an absolute file path, if it is a local upload. */
export function resolveLocalUploadPath(imagePath: string): string | null {
  if (!imagePath) return null;

  let filename = "";
  if (imagePath.startsWith("/api/media/")) {
    filename = decodeURIComponent(imagePath.slice("/api/media/".length));
  } else if (imagePath.startsWith("/uploads/")) {
    filename = decodeURIComponent(imagePath.slice("/uploads/".length));
  } else {
    return null;
  }

  if (
    !filename ||
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return null;
  }

  return path.join(getUploadDir(), filename);
}

async function ensureUploadDir() {
  const dir = getUploadDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Normalize phone/camera uploads to JPEG (EXIF-rotated) and store them.
 * Returns a public URL served by /api/media.
 */
export async function saveMealImage(buffer: Buffer, userId: string) {
  const dir = await ensureUploadDir();
  const filename = `${userId}-${Date.now()}-${randomUUID()}.jpg`;
  const filepath = path.join(dir, filename);

  try {
    const jpeg = await sharp(buffer, { failOn: "none" })
      .rotate()
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    await writeFile(filepath, jpeg);
  } catch {
    await writeFile(filepath, buffer);
  }

  return toPublicMediaPath(filename);
}

/** Square avatar JPEG for profile / start page. */
export async function saveAvatarImage(buffer: Buffer, userId: string) {
  const dir = await ensureUploadDir();
  const filename = `avatar-${userId}-${Date.now()}-${randomUUID()}.jpg`;
  const filepath = path.join(dir, filename);

  const jpeg = await sharp(buffer, { failOn: "none" })
    .rotate()
    .resize(512, 512, { fit: "cover", position: "attention" })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  await writeFile(filepath, jpeg);

  return toPublicMediaPath(filename);
}

export async function fileExists(filepath: string) {
  try {
    await access(filepath);
    return true;
  } catch {
    return false;
  }
}
