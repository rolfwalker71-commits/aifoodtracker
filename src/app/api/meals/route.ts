import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const mealSchema = z.object({
  name: z.string().min(1),
  portionSize: z.string().optional().nullable(),
  imagePath: z.string().optional().nullable(),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  consumedAt: z.string().datetime().or(z.string().min(1)),
  calories: z.coerce.number().nonnegative(),
  protein: z.coerce.number().nonnegative(),
  carbs: z.coerce.number().nonnegative(),
  fat: z.coerce.number().nonnegative(),
  fiber: z.coerce.number().nonnegative().default(0),
  sugar: z.coerce.number().nonnegative().default(0),
  saturatedFat: z.coerce.number().nonnegative().default(0),
  sodium: z.coerce.number().nonnegative().default(0),
  potassium: z.coerce.number().nonnegative().default(0),
  vitaminA: z.coerce.number().nonnegative().default(0),
  vitaminC: z.coerce.number().nonnegative().default(0),
  vitaminD: z.coerce.number().nonnegative().default(0),
  calcium: z.coerce.number().nonnegative().default(0),
  iron: z.coerce.number().nonnegative().default(0),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const meals = await prisma.meal.findMany({
    where: {
      userId: user.id,
      ...(from || to
        ? {
            consumedAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { consumedAt: "desc" },
  });

  return NextResponse.json({ meals });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = mealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültige Mahlzeitendaten", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const meal = await prisma.meal.create({
      data: {
        ...parsed.data,
        userId: user.id,
        consumedAt: new Date(parsed.data.consumedAt),
      },
    });

    return NextResponse.json({ meal }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Mahlzeit konnte nicht gespeichert werden" },
      { status: 500 },
    );
  }
}
