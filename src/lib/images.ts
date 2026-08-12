import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const USER_AGENT =
  "NutriSight/1.0 (https://github.com/rolfwalker71-commits/aifoodtracker; food-tracker)";

function extensionFromContentType(contentType: string | null, url: string) {
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("gif")) return "gif";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return "jpg";
  const fromUrl = url.split("?")[0]?.split(".").pop()?.toLowerCase();
  if (fromUrl && ["png", "jpg", "jpeg", "webp", "gif"].includes(fromUrl)) {
    return fromUrl === "jpeg" ? "jpg" : fromUrl;
  }
  return "jpg";
}

/** Persist a remote product image into /public/uploads and return the public path. */
export async function persistRemoteImage(
  imageUrl: string,
  userId: string,
): Promise<string | null> {
  if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  try {
    const response = await fetch(imageUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "image/*" },
      cache: "no-store",
    });
    if (!response.ok) return imageUrl;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 32) return imageUrl;

    const extension = extensionFromContentType(
      response.headers.get("content-type"),
      imageUrl,
    );
    const filename = `${userId}-${Date.now()}-${randomUUID()}.${extension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);
    return `/uploads/${filename}`;
  } catch {
    return imageUrl;
  }
}
