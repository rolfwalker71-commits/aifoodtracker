import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { decryptSecret, encryptSecret, maskApiKey } from "@/lib/crypto";
import { NO_STORE_HEADERS } from "@/lib/meal-cache";
import { prisma } from "@/lib/prisma";
import { parseReminderSettings, serializeReminderSettings } from "@/lib/reminders";
import { requireUser } from "@/lib/session";
import { resolveAvatarForUser } from "@/lib/uploads";
import {
  calculateBmr,
  calculateDailyGoals,
  calculateTdee,
  canCalculateGoals,
  type ActivityLevel,
  type Sex,
} from "@/lib/tdee";

const reminderItemSchema = z.object({
  id: z.string().min(1),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  timeLocal: z.string().regex(/^\d{2}:\d{2}$/),
  enabled: z.boolean(),
});

const extraReminderSchema = z.object({
  restCoach: z.object({
    enabled: z.boolean(),
    timeLocal: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  weeklyWeight: z.object({
    enabled: z.boolean(),
    weekday: z.number().int().min(0).max(6),
    timeLocal: z.string().regex(/^\d{2}:\d{2}$/),
  }),
});

const reminderSettingsSchema = z.object({
  meals: z.array(reminderItemSchema),
  extras: extraReminderSchema,
});

const profileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  sex: z.enum(["MALE", "FEMALE"]).optional().nullable(),
  heightCm: z.coerce.number().positive().max(250).optional().nullable(),
  weightKg: z.coerce.number().positive().max(400).optional().nullable(),
  birthYear: z.coerce.number().int().min(1920).max(2015).optional().nullable(),
  activityLevel: z
    .enum(["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"])
    .optional(),
  goalMode: z.enum(["LOSE", "MAINTAIN", "GAIN"]).optional(),
  autoCalculateGoals: z.boolean().optional(),
  dailyCaloriesGoal: z.coerce.number().positive().optional(),
  dailyProteinGoal: z.coerce.number().positive().optional(),
  dailyCarbsGoal: z.coerce.number().positive().optional(),
  dailyFatGoal: z.coerce.number().positive().optional(),
  dailyFiberGoal: z.coerce.number().positive().optional(),
  dailySugarGoal: z.coerce.number().positive().optional(),
  dailySodiumGoal: z.coerce.number().positive().optional(),
  dailyPotassiumGoal: z.coerce.number().positive().optional(),
  dailyVitaminAGoal: z.coerce.number().positive().optional(),
  dailyVitaminCGoal: z.coerce.number().positive().optional(),
  dailyVitaminDGoal: z.coerce.number().positive().optional(),
  dailyCalciumGoal: z.coerce.number().positive().optional(),
  dailyIronGoal: z.coerce.number().positive().optional(),
  reminders: reminderSettingsSchema.optional(),
  openAiApiKey: z.string().optional().nullable(),
  clearOpenAiApiKey: z.boolean().optional(),
});

const profileSelect = {
  id: true,
  email: true,
  name: true,
  avatarPath: true,
  sex: true,
  heightCm: true,
  weightKg: true,
  birthYear: true,
  activityLevel: true,
  goalMode: true,
  autoCalculateGoals: true,
  dailyCaloriesGoal: true,
  dailyProteinGoal: true,
  dailyCarbsGoal: true,
  dailyFatGoal: true,
  dailyFiberGoal: true,
  dailySugarGoal: true,
  dailySodiumGoal: true,
  dailyPotassiumGoal: true,
  dailyVitaminAGoal: true,
  dailyVitaminCGoal: true,
  dailyVitaminDGoal: true,
  dailyCalciumGoal: true,
  dailyIronGoal: true,
  reminders: true,
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
  const avatarPath = await resolveAvatarForUser({
    userId: user.id,
    avatarPath: profile.avatarPath,
  });

  return NextResponse.json(
    {
      profile: {
        ...profile,
        avatarPath,
        reminders: parseReminderSettings(profile.reminders),
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

    if (parsed.data.reminders) {
      data.reminders = serializeReminderSettings(parsed.data.reminders);
    }

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
      goalMode:
        (data.goalMode as "LOSE" | "MAINTAIN" | "GAIN" | undefined) ??
        existing.goalMode ??
        "MAINTAIN",
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
      const goals = calculateDailyGoals(
        {
          sex: merged.sex as Sex,
          heightCm: merged.heightCm as number,
          weightKg: merged.weightKg as number,
          birthYear: merged.birthYear as number,
          activityLevel: merged.activityLevel,
        },
        merged.goalMode,
      );
      Object.assign(data, goals);
    }

    const profile = await prisma.user.update({
      where: { id: user.id },
      data,
      select: profileSelect,
    });

    if (
      typeof parsed.data.weightKg === "number" &&
      parsed.data.weightKg > 0
    ) {
      const day = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Zurich",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      await prisma.weightEntry.upsert({
        where: {
          userId_recordedOn: {
            userId: user.id,
            recordedOn: new Date(`${day}T00:00:00.000Z`),
          },
        },
        create: {
          userId: user.id,
          kg: parsed.data.weightKg,
          recordedOn: new Date(`${day}T00:00:00.000Z`),
        },
        update: { kg: parsed.data.weightKg },
      });
    }

    revalidatePath("/dashboard", "layout");
    revalidatePath("/stats", "layout");
    revalidatePath("/settings", "page");

    const meta = metaFromProfile(profile);

    return NextResponse.json(
      {
        profile: {
          ...profile,
          reminders: parseReminderSettings(profile.reminders),
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
