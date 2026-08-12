import { NextResponse } from "next/server";
import { z } from "zod";
import { parseAppDateTime } from "@/lib/datetime";
import { persistRemoteImage } from "@/lib/images";
import { mealIngredientsField } from "@/lib/meal-ingredients";
import { NO_STORE_HEADERS, revalidateMealViews } from "@/lib/meal-cache";
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
  ingredients: mealIngredientsField,
});

type Params = { params: Promise<{ id: string }> };

async function getOwnedMeal(userId: string, id: string) {
  return prisma.meal.findFirst({ where: { id, userId } });
}

export async function GET(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const meal = await getOwnedMeal(user.id, id);
  if (!meal) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }
  return NextResponse.json({ meal }, { headers: NO_STORE_HEADERS });
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getOwnedMeal(user.id, id);
    if (!existing) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = mealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültige Mahlzeitendaten" },
        { status: 400 },
      );
    }

    const {
      ingredients = [],
      imagePath: rawImagePath,
      consumedAt,
      ...mealFields
    } = parsed.data;

    const imagePath = rawImagePath
      ? await persistRemoteImage(rawImagePath, user.id)
      : rawImagePath;

    const meal = await prisma.meal.update({
      where: { id },
      data: {
        ...mealFields,
        ingredients,
        imagePath,
        consumedAt: parseAppDateTime(consumedAt),
      },
    });

    revalidateMealViews(id);

    return NextResponse.json({ meal }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error(error);
    const detail =
      error instanceof Error && error.message.includes("Unknown argument")
        ? "Datenbankschema veraltet – App bitte neu starten."
        : "Aktualisierung fehlgeschlagen";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getOwnedMeal(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  await prisma.meal.delete({ where: { id } });
  revalidateMealViews(id);

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
