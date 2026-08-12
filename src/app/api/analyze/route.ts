import { NextResponse } from "next/server";
import { analyzeMealImage } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { saveMealImage } from "@/lib/uploads";

export const runtime = "nodejs";

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

    const dbUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { openAiApiKey: true },
    });

    const buffer = Buffer.from(await image.arrayBuffer());
    const imagePath = await saveMealImage(buffer, user.id);

    const analysis = await analyzeMealImage({
      imageBase64: buffer.toString("base64"),
      mimeType: image.type || "image/jpeg",
      encryptedUserKey: dbUser.openAiApiKey,
    });

    return NextResponse.json({ analysis, imagePath });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Foto-Analyse fehlgeschlagen",
      },
      { status: 500 },
    );
  }
}
