import { unlink } from "fs/promises";
import { NextResponse } from "next/server";
import { NO_STORE_HEADERS } from "@/lib/meal-cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  resolveLocalUploadPath,
  saveAvatarImage,
} from "@/lib/uploads";

export const runtime = "nodejs";

async function removeLocalAvatar(avatarPath: string | null | undefined) {
  if (!avatarPath) return;
  const filepath = resolveLocalUploadPath(avatarPath);
  if (!filepath) return;
  try {
    await unlink(filepath);
  } catch {
    // ignore missing file
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const image = formData.get("image");
    if (!(image instanceof File)) {
      return NextResponse.json({ error: "Bild fehlt" }, { status: 400 });
    }
    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Nur Bilddateien sind erlaubt" },
        { status: 400 },
      );
    }
    if (image.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Bild ist zu gross (max. 8 MB)" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { avatarPath: true },
    });

    const buffer = Buffer.from(await image.arrayBuffer());
    const avatarPath = await saveAvatarImage(buffer, user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { avatarPath },
    });
    await removeLocalAvatar(existing.avatarPath);

    return NextResponse.json(
      { avatarPath },
      { status: 201, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Avatar konnte nicht hochgeladen werden",
      },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { avatarPath: true },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { avatarPath: null },
    });
    await removeLocalAvatar(existing.avatarPath);

    return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Avatar konnte nicht entfernt werden" },
      { status: 500 },
    );
  }
}
