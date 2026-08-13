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

/**
 * Normalize stored paths to the authenticated media route.
 * Legacy `/uploads/…` entries break after Docker deploys (no static public files).
 */
export function toServableMediaUrl(
  imagePath: string | null | undefined,
): string | null {
  if (!imagePath?.trim()) return null;
  const trimmed = imagePath.trim();
  if (trimmed.startsWith("/api/media/")) return trimmed;
  if (trimmed.startsWith("/uploads/")) {
    const filename = trimmed.slice("/uploads/".length);
    if (
      !filename ||
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return null;
    }
    return toPublicMediaPath(filename);
  }
  return null;
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

/** True when a stored media path points at an existing local file. */
export async function localMediaExists(
  imagePath: string | null | undefined,
): Promise<boolean> {
  if (!imagePath) return false;
  const absolute = resolveLocalUploadPath(imagePath);
  if (absolute && (await fileExists(absolute))) return true;

  // Legacy locations (pre bind-mount / wrong UPLOAD_DIR)
  let filename = "";
  if (imagePath.startsWith("/api/media/")) {
    filename = decodeURIComponent(imagePath.slice("/api/media/".length));
  } else if (imagePath.startsWith("/uploads/")) {
    filename = decodeURIComponent(imagePath.slice("/uploads/".length));
  }
  if (
    !filename ||
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return false;
  }

  const legacyPublic = path.join(process.cwd(), "public", "uploads", filename);
  if (await fileExists(legacyPublic)) return true;

  return false;
}

/**
 * URL for UI if the file exists on disk; otherwise null.
 * Clears stale DB paths so deploys without the bind-mounted file don't show broken images.
 */
export async function resolveAvatarForUser(params: {
  userId: string;
  avatarPath: string | null | undefined;
}): Promise<string | null> {
  const servable = toServableMediaUrl(params.avatarPath);
  if (!servable) {
    if (params.avatarPath) {
      void prismaClearAvatar(params.userId).catch(() => undefined);
    }
    return null;
  }

  if (await localMediaExists(params.avatarPath)) {
    // Prefer canonical /api/media URL even if DB still has /uploads/
    if (servable !== params.avatarPath) {
      void prismaUpdateAvatarPath(params.userId, servable).catch(
        () => undefined,
      );
    }
    return servable;
  }

  // Also try the servable path resolution (same file)
  if (await localMediaExists(servable)) {
    if (servable !== params.avatarPath) {
      void prismaUpdateAvatarPath(params.userId, servable).catch(
        () => undefined,
      );
    }
    return servable;
  }

  void prismaClearAvatar(params.userId).catch(() => undefined);
  return null;
}

async function prismaClearAvatar(userId: string) {
  const { prisma } = await import("@/lib/prisma");
  await prisma.user.update({
    where: { id: userId },
    data: { avatarPath: null },
  });
}

async function prismaUpdateAvatarPath(userId: string, avatarPath: string) {
  const { prisma } = await import("@/lib/prisma");
  await prisma.user.update({
    where: { id: userId },
    data: { avatarPath },
  });
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
