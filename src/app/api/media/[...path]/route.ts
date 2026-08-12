import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { fileExists, getUploadDir, resolveLocalUploadPath } from "@/lib/uploads";

export const runtime = "nodejs";

function contentTypeFor(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".heic":
    case ".heif":
      return "image/heic";
    case ".jpg":
    case ".jpeg":
    default:
      return "image/jpeg";
  }
}

type Params = { params: Promise<{ path: string[] }> };

async function readUpload(filename: string) {
  const primary = resolveLocalUploadPath(`/api/media/${filename}`);
  if (primary && (await fileExists(primary))) {
    return primary;
  }

  const legacy = path.join(
    process.cwd(),
    "public",
    "uploads",
    path.basename(filename),
  );
  if (await fileExists(legacy)) {
    return legacy;
  }

  const fallback = path.join(getUploadDir(), path.basename(filename));
  if (await fileExists(fallback)) {
    return fallback;
  }

  return null;
}

export async function GET(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const segments = (await params).path || [];
  const filename = segments.join("/");
  if (
    !filename ||
    filename.includes("..") ||
    filename.includes("\\") ||
    filename.startsWith("/")
  ) {
    return NextResponse.json({ error: "Ungültiger Pfad" }, { status: 400 });
  }

  const absolute = await readUpload(filename);
  if (!absolute) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  const data = await readFile(absolute);
  return new NextResponse(data, {
    headers: {
      "Content-Type": contentTypeFor(absolute),
      "Content-Length": String(data.byteLength),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
