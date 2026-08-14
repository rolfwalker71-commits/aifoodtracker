import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { NO_STORE_HEADERS } from "@/lib/meal-cache";
import { revalidatePath } from "next/cache";
import {
  calculateDailyGoals,
  canCalculateGoals,
  type ActivityLevel,
  type Sex,
} from "@/lib/tdee";
import { normalizeGoalMode } from "@/lib/goal-mode";
import { APP_TIMEZONE } from "@/lib/datetime";

const createSchema = z.object({
  kg: z.coerce.number().positive().min(30).max(400),
  recordedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function zurichDayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.weightEntry.findMany({
    where: { userId: user.id },
    orderBy: { recordedOn: "asc" },
    take: 90,
  });

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { weightKg: true },
  });

  return NextResponse.json(
    {
      currentKg: entries.at(-1)?.kg ?? profile?.weightKg ?? null,
      entries: entries.map((entry) => ({
        id: entry.id,
        kg: entry.kg,
        recordedOn: entry.recordedOn.toISOString().slice(0, 10),
      })),
    },
    { headers: NO_STORE_HEADERS },
  );
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültiges Gewicht" }, { status: 400 });
  }

  const day = parsed.data.recordedOn || zurichDayKey();
  const recordedOn = new Date(`${day}T00:00:00.000Z`);
  const kg = Math.round(parsed.data.kg * 10) / 10;

  const entry = await prisma.weightEntry.upsert({
    where: {
      userId_recordedOn: { userId: user.id, recordedOn },
    },
    create: { userId: user.id, kg, recordedOn },
    update: { kg },
  });

  const existing = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      sex: true,
      heightCm: true,
      birthYear: true,
      activityLevel: true,
      goalMode: true,
      autoCalculateGoals: true,
    },
  });

  const data: Record<string, unknown> = { weightKg: kg };
  if (
    existing.autoCalculateGoals &&
    canCalculateGoals({
      sex: existing.sex ?? undefined,
      heightCm: existing.heightCm ?? undefined,
      weightKg: kg,
      birthYear: existing.birthYear ?? undefined,
      activityLevel: existing.activityLevel,
    })
  ) {
    Object.assign(
      data,
      calculateDailyGoals(
        {
          sex: existing.sex as Sex,
          heightCm: existing.heightCm as number,
          weightKg: kg,
          birthYear: existing.birthYear as number,
          activityLevel: existing.activityLevel as ActivityLevel,
        },
        normalizeGoalMode(existing.goalMode),
      ),
    );
  }

  await prisma.user.update({ where: { id: user.id }, data });
  revalidatePath("/dashboard", "layout");
  revalidatePath("/stats", "layout");
  revalidatePath("/settings", "page");

  return NextResponse.json(
    {
      entry: {
        id: entry.id,
        kg: entry.kg,
        recordedOn: day,
      },
    },
    { status: 201, headers: NO_STORE_HEADERS },
  );
}
