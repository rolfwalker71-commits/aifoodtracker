import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeIngredients } from "@/lib/meal-ingredients";
import { estimateFoodByName } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { FoodLookupItem } from "@/types/nutrition";

const bodySchema = z.object({
  query: z.string().min(2).max(160),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { openAiApiKey: true },
    });

    const estimate = await estimateFoodByName({
      query: parsed.data.query,
      encryptedUserKey: dbUser.openAiApiKey,
    });

    const item: FoodLookupItem = {
      id: `ai-${Buffer.from(estimate.name).toString("base64url").slice(0, 24)}`,
      source: "ai",
      name: estimate.name,
      brand: estimate.brand || undefined,
      servingSizeLabel:
        estimate.servingSizeLabel || `${estimate.suggestedServingGrams} g`,
      servingGrams: estimate.suggestedServingGrams,
      nutrientsPer100g: estimate.nutrientsPer100g,
      ingredients: normalizeIngredients(estimate.ingredients),
    };

    return NextResponse.json({
      item,
      mealType: estimate.mealType,
      notes: estimate.notes,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "KI-Schätzung fehlgeschlagen",
      },
      { status: 500 },
    );
  }
}
