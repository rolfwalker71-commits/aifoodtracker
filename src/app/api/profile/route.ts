import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { decryptSecret, encryptSecret, maskApiKey } from "@/lib/crypto";
import { NO_STORE_HEADERS } from "@/lib/meal-cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  calculateBmr,
  calculateDailyGoals,
  calculateTdee,
  canCalculateGoals,
  type ActivityLevel,
  type Sex,
} from "@/lib/tdee";

const profileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  sex: z.enum(["MALE", "FEMALE"]).optional().nullable(),
  heightCm: z.coerce.number().positive().max(250).optional().nullable(),
  weightKg: z.coerce.number().positive().max(400).optional().nullable(),
  birthYear: z.coerce.number().int().min(1920).max(2015).optional().nullable(),
  activityLevel: z
    .enum(["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"])
    .optional(),
  autoCalculateGoals: z.boolean().optional(),
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

const profileSelect = {
  id: true,
  email: true,
  name: true,
  sex: true,
  heightCm: true,
  weightKg: true,
  birthYear: true,
  activityLevel: true,
  autoCalculateGoals: true,
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
} as const;

function metaFromProfile(profile: {
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  birthYear: number | null;
  activityLevel: ActivityLevel;
}) {
  const body = {
    sex: profile.sex ?? undefined,
    heightCm: profile.heightCm ?? undefined,
    weightKg: profile.weightKg ?? undefined,
    birthYear: profile.birthYear ?? undefined,
    activityLevel: profile.activityLevel,
  };

  if (!canCalculateGoals(body)) {
    return {
      profileComplete: false,
      bmr: null as number | null,
      tdee: null as number | null,
    };
  }

  const input = {
    sex: body.sex as Sex,
    heightCm: body.heightCm as number,
    weightKg: body.weightKg as number,
    birthYear: body.birthYear as number,
    activityLevel: body.activityLevel,
  };

  return {
    profileComplete: true,
    bmr: Math.round(calculateBmr(input)),
    tdee: Math.round(calculateTdee(input)),
  };
}

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: profileSelect,
  });

  let maskedKey = "";
  if (profile.openAiApiKey) {
    try {
      maskedKey = maskApiKey(decryptSecret(profile.openAiApiKey));
    } catch {
      maskedKey = "••••••••";
    }
  }

  const meta = metaFromProfile(profile);

  return NextResponse.json(
    {
      profile: {
        ...profile,
        openAiApiKey: undefined,
        hasOpenAiApiKey: Boolean(profile.openAiApiKey),
        openAiApiKeyMasked: maskedKey,
        ...meta,
      },
    },
    { headers: NO_STORE_HEADERS },
  );
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

    const existing = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: profileSelect,
    });

    const data: Record<string, unknown> = { ...parsed.data };
    delete data.openAiApiKey;
    delete data.clearOpenAiApiKey;

    if (parsed.data.clearOpenAiApiKey) {
      data.openAiApiKey = null;
    } else if (parsed.data.openAiApiKey && parsed.data.openAiApiKey.trim()) {
      data.openAiApiKey = encryptSecret(parsed.data.openAiApiKey.trim());
    }

    const merged = {
      sex: (data.sex as Sex | null | undefined) ?? existing.sex,
      heightCm:
        (data.heightCm as number | null | undefined) ?? existing.heightCm,
      weightKg:
        (data.weightKg as number | null | undefined) ?? existing.weightKg,
      birthYear:
        (data.birthYear as number | null | undefined) ?? existing.birthYear,
      activityLevel:
        (data.activityLevel as ActivityLevel | undefined) ??
        existing.activityLevel,
      autoCalculateGoals:
        typeof data.autoCalculateGoals === "boolean"
          ? data.autoCalculateGoals
          : existing.autoCalculateGoals,
    };

    if (
      merged.autoCalculateGoals &&
      canCalculateGoals({
        sex: merged.sex ?? undefined,
        heightCm: merged.heightCm ?? undefined,
        weightKg: merged.weightKg ?? undefined,
        birthYear: merged.birthYear ?? undefined,
        activityLevel: merged.activityLevel,
      })
    ) {
      const goals = calculateDailyGoals({
        sex: merged.sex as Sex,
        heightCm: merged.heightCm as number,
        weightKg: merged.weightKg as number,
        birthYear: merged.birthYear as number,
        activityLevel: merged.activityLevel,
      });
      Object.assign(data, goals);
    }

    const profile = await prisma.user.update({
      where: { id: user.id },
      data,
      select: profileSelect,
    });

    revalidatePath("/dashboard", "layout");
    revalidatePath("/stats", "layout");
    revalidatePath("/settings", "page");

    const meta = metaFromProfile(profile);

    return NextResponse.json(
      {
        profile: {
          ...profile,
          openAiApiKey: undefined,
          hasOpenAiApiKey: Boolean(profile.openAiApiKey),
          ...meta,
        },
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Profil konnte nicht aktualisiert werden" },
      { status: 500 },
    );
  }
}
