import { saveMealImage } from "@/lib/uploads";
import { generateMealSymbolImage } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { revalidateMealViews } from "@/lib/meal-cache";

const USER_AGENT =
  "NutriSight/1.0 (https://github.com/rolfwalker71-commits/aifoodtracker; food-tracker)";

/** Persist a remote product image and return a local /api/media path. */
export async function persistRemoteImage(
  imageUrl: string,
  userId: string,
): Promise<string | null> {
  if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  try {
    const response = await fetch(imageUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "image/*" },
      cache: "no-store",
    });
    if (!response.ok) return imageUrl;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 32) return imageUrl;

    return await saveMealImage(buffer, userId);
  } catch {
    return imageUrl;
  }
}

/** Generate a cheap symbol and attach it if the meal still has no image. */
export async function attachMealSymbolIfMissing(params: {
  mealId: string;
  userId: string;
}): Promise<string | null> {
  const meal = await prisma.meal.findFirst({
    where: { id: params.mealId, userId: params.userId },
    select: { id: true, name: true, imagePath: true },
  });
  if (!meal) return null;
  if (meal.imagePath) return meal.imagePath;

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { openAiApiKey: true },
  });

  const buffer = await generateMealSymbolImage({
    foodName: meal.name,
    encryptedUserKey: user?.openAiApiKey,
  });
  const imagePath = await saveMealImage(buffer, params.userId);

  const updated = await prisma.meal.updateMany({
    where: { id: meal.id, userId: params.userId, imagePath: null },
    data: { imagePath },
  });
  if (updated.count > 0) {
    revalidateMealViews(meal.id);
    return imagePath;
  }

  const current = await prisma.meal.findFirst({
    where: { id: meal.id, userId: params.userId },
    select: { imagePath: true },
  });
  return current?.imagePath ?? imagePath;
}
