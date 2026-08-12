import { NextResponse } from "next/server";
import { z } from "zod";
import { parseAppDateTime } from "@/lib/datetime";
import { resolveMealImagePath } from "@/lib/images";
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

  return NextResponse.json({ meals }, { headers: NO_STORE_HEADERS });
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

    const {
      ingredients = [],
      imagePath: rawImagePath,
      consumedAt,
      ...mealFields
    } = parsed.data;

    const imagePath = await resolveMealImagePath({
      userId: user.id,
      foodName: mealFields.name,
      imagePath: rawImagePath,
    });

    const meal = await prisma.meal.create({
      data: {
        ...mealFields,
        ingredients,
        imagePath,
        userId: user.id,
        consumedAt: parseAppDateTime(consumedAt),
      },
    });

    revalidateMealViews(meal.id);

    return NextResponse.json(
      { meal },
      { status: 201, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error(error);
    const detail =
      error instanceof Error && error.message.includes("Unknown argument")
        ? "Datenbankschema veraltet – App bitte neu starten."
        : "Mahlzeit konnte nicht gespeichert werden";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
