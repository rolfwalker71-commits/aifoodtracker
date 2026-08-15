import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { NO_STORE_HEADERS } from "@/lib/meal-cache";
import {
  calculateDailyGoals,
  canCalculateGoals,
  type ActivityLevel,
  type Sex,
} from "@/lib/tdee";
import { normalizeGoalMode } from "@/lib/goal-mode";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  kg: z.coerce.number().positive().min(30).max(400).optional(),
  recordedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

async function syncProfileWeight(userId: string) {
  const latest = await prisma.weightEntry.findFirst({
    where: { userId },
    orderBy: { recordedOn: "desc" },
    select: { kg: true },
  });

  const existing = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      sex: true,
      heightCm: true,
      birthYear: true,
      activityLevel: true,
      goalMode: true,
      autoCalculateGoals: true,
    },
  });

  const data: Record<string, unknown> = {
    weightKg: latest?.kg ?? null,
  };

  if (
    latest &&
    existing.autoCalculateGoals &&
    canCalculateGoals({
      sex: existing.sex ?? undefined,
      heightCm: existing.heightCm ?? undefined,
      weightKg: latest.kg,
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
          weightKg: latest.kg,
          birthYear: existing.birthYear as number,
          activityLevel: existing.activityLevel as ActivityLevel,
        },
        normalizeGoalMode(existing.goalMode),
      ),
    );
  }

  await prisma.user.update({ where: { id: userId }, data });
  revalidatePath("/dashboard", "layout");
  revalidatePath("/stats", "layout");
  revalidatePath("/settings", "page");
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.weightEntry.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
  }

  const kg =
    parsed.data.kg != null
      ? Math.round(parsed.data.kg * 10) / 10
      : existing.kg;
  const recordedOn = parsed.data.recordedOn
    ? new Date(`${parsed.data.recordedOn}T00:00:00.000Z`)
    : existing.recordedOn;

  if (parsed.data.recordedOn) {
    const clash = await prisma.weightEntry.findFirst({
      where: {
        userId: user.id,
        recordedOn,
        NOT: { id },
      },
      select: { id: true },
    });
    if (clash) {
      return NextResponse.json(
        { error: "Für dieses Datum gibt es schon einen Eintrag" },
        { status: 409 },
      );
    }
  }

  const entry = await prisma.weightEntry.update({
    where: { id },
    data: { kg, recordedOn },
  });

  await syncProfileWeight(user.id);

  return NextResponse.json(
    {
      entry: {
        id: entry.id,
        kg: entry.kg,
        recordedOn: entry.recordedOn.toISOString().slice(0, 10),
      },
    },
    { headers: NO_STORE_HEADERS },
  );
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.weightEntry.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
  }

  await prisma.weightEntry.delete({ where: { id } });
  await syncProfileWeight(user.id);

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
