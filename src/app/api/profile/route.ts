import { NextResponse } from "next/server";
import { z } from "zod";
import { encryptSecret, maskApiKey } from "@/lib/crypto";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const profileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  dailyCaloriesGoal: z.coerce.number().positive().optional(),
  dailyProteinGoal: z.coerce.number().positive().optional(),
  dailyCarbsGoal: z.coerce.number().positive().optional(),
  dailyFatGoal: z.coerce.number().positive().optional(),
  dailyFiberGoal: z.coerce.number().positive().optional(),
  dailySugarGoal: z.coerce.number().positive().optional(),
  dailySodiumGoal: z.coerce.number().positive().optional(),
  dailyPotassiumGoal: z.coerce.number().positive().optional(),
  openAiApiKey: z.string().optional().nullable(),
  clearOpenAiApiKey: z.boolean().optional(),
});

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      dailyCaloriesGoal: true,
      dailyProteinGoal: true,
      dailyCarbsGoal: true,
      dailyFatGoal: true,
      dailyFiberGoal: true,
      dailySugarGoal: true,
      dailySodiumGoal: true,
      dailyPotassiumGoal: true,
      openAiApiKey: true,
      createdAt: true,
    },
  });

  let maskedKey = "";
  if (profile.openAiApiKey) {
    try {
      maskedKey = maskApiKey(decryptSecret(profile.openAiApiKey));
    } catch {
      maskedKey = "••••••••";
    }
  }

  return NextResponse.json({
    profile: {
      ...profile,
      openAiApiKey: undefined,
      hasOpenAiApiKey: Boolean(profile.openAiApiKey),
      openAiApiKeyMasked: maskedKey,
    },
  });
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültige Profildaten" },
        { status: 400 },
      );
    }

    const data: Record<string, unknown> = { ...parsed.data };
    delete data.openAiApiKey;
    delete data.clearOpenAiApiKey;

    if (parsed.data.clearOpenAiApiKey) {
      data.openAiApiKey = null;
    } else if (parsed.data.openAiApiKey && parsed.data.openAiApiKey.trim()) {
      data.openAiApiKey = encryptSecret(parsed.data.openAiApiKey.trim());
    }

    const profile = await prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        dailyCaloriesGoal: true,
        dailyProteinGoal: true,
        dailyCarbsGoal: true,
        dailyFatGoal: true,
        dailyFiberGoal: true,
        dailySugarGoal: true,
        dailySodiumGoal: true,
        dailyPotassiumGoal: true,
        openAiApiKey: true,
      },
    });

    return NextResponse.json({
      profile: {
        ...profile,
        openAiApiKey: undefined,
        hasOpenAiApiKey: Boolean(profile.openAiApiKey),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Profil konnte nicht aktualisiert werden" },
      { status: 500 },
    );
  }
}
