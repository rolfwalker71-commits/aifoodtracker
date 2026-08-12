import { NextResponse } from "next/server";
import { z } from "zod";
import {
  generateApiAccessKey,
  MAX_API_ACCESS_KEYS,
} from "@/lib/api-access-keys";
import { NO_STORE_HEADERS } from "@/lib/meal-cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const createSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
});

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.apiAccessKey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ keys }, { headers: NO_STORE_HEADERS });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Ungültiger Name" }, { status: 400 });
    }

    const count = await prisma.apiAccessKey.count({
      where: { userId: user.id },
    });
    if (count >= MAX_API_ACCESS_KEYS) {
      return NextResponse.json(
        {
          error: `Maximal ${MAX_API_ACCESS_KEYS} API-Keys erlaubt. Bitte einen alten widerrufen.`,
        },
        { status: 400 },
      );
    }

    const generated = generateApiAccessKey();
    const key = await prisma.apiAccessKey.create({
      data: {
        userId: user.id,
        name: parsed.data.name || "Standard",
        keyPrefix: generated.keyPrefix,
        keyHash: generated.keyHash,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        key,
        /** Only returned once — store it now. */
        rawKey: generated.rawKey,
      },
      { status: 201, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "API-Key konnte nicht erzeugt werden" },
      { status: 500 },
    );
  }
}
