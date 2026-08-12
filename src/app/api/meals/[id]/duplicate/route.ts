import { NextResponse, after } from "next/server";
import { attachMealSymbolIfMissing } from "@/lib/images";
import { NO_STORE_HEADERS, revalidateMealViews } from "@/lib/meal-cache";
import { suggestMealTypeNow } from "@/lib/nutrition";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.meal.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    const meal = await prisma.meal.create({
      data: {
        userId: user.id,
        name: existing.name,
        portionSize: existing.portionSize,
        imagePath: existing.imagePath,
        ingredients: existing.ingredients ?? undefined,
        calories: existing.calories,
        protein: existing.protein,
        carbs: existing.carbs,
        fat: existing.fat,
        fiber: existing.fiber,
        sugar: existing.sugar,
        saturatedFat: existing.saturatedFat,
        sodium: existing.sodium,
        potassium: existing.potassium,
        vitaminA: existing.vitaminA,
        vitaminC: existing.vitaminC,
        vitaminD: existing.vitaminD,
        calcium: existing.calcium,
        iron: existing.iron,
        mealType: suggestMealTypeNow(),
        notes: existing.notes,
        isFavorite: false,
        consumedAt: new Date(),
      },
    });

    revalidateMealViews(meal.id);

    if (!meal.imagePath) {
      after(() => {
        void attachMealSymbolIfMissing({
          mealId: meal.id,
          userId: user.id,
        }).catch((error) => {
          console.error("Hintergrund-Symbolbild fehlgeschlagen:", error);
        });
      });
    }

    return NextResponse.json(
      { meal },
      { status: 201, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kopie konnte nicht angelegt werden" },
      { status: 500 },
    );
  }
}
