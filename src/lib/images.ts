import { saveMealImage, fileExists, resolveLocalUploadPath } from "@/lib/uploads";
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

/** True when there is no usable local image file (null path or deleted upload). */
export async function isLocalMealImageMissing(
  imagePath: string | null | undefined,
): Promise<boolean> {
  if (!imagePath?.trim()) return true;

  const trimmed = imagePath.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return false;
  }

  const local = resolveLocalUploadPath(trimmed);
  if (!local) return true;
  return !(await fileExists(local));
}

/**
 * Generate a cheap symbol and attach it when the meal has no image
 * or the stored local file is missing (e.g. after Docker redeploy).
 */
export async function attachMealSymbolIfMissing(params: {
  mealId: string;
  userId: string;
}): Promise<string | null> {
  const meal = await prisma.meal.findFirst({
    where: { id: params.mealId, userId: params.userId },
    select: { id: true, name: true, imagePath: true },
  });
  if (!meal) return null;

  const missing = await isLocalMealImageMissing(meal.imagePath);
  if (!missing && meal.imagePath) return meal.imagePath;

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { openAiApiKey: true },
  });

  const buffer = await generateMealSymbolImage({
    foodName: meal.name,
    encryptedUserKey: user?.openAiApiKey,
  });
  const imagePath = await saveMealImage(buffer, params.userId);

  await prisma.meal.update({
    where: { id: meal.id },
    data: { imagePath },
  });
  revalidateMealViews(meal.id);
  return imagePath;
}

/** Backfill AI symbols for meals with empty or deleted image files. */
export async function backfillMissingMealSymbols(
  userId: string,
  options?: { limit?: number; checkTake?: number },
) {
  const limit = options?.limit ?? 40;
  const checkTake = options?.checkTake ?? 200;

  const meals = await prisma.meal.findMany({
    where: { userId },
    orderBy: { consumedAt: "desc" },
    take: checkTake,
    select: { id: true, imagePath: true },
  });

  const targets: string[] = [];
  for (const meal of meals) {
    if (await isLocalMealImageMissing(meal.imagePath)) {
      targets.push(meal.id);
      if (targets.length >= limit) break;
    }
  }

  let done = 0;
  const failed: string[] = [];

  for (const mealId of targets) {
    try {
      const path = await attachMealSymbolIfMissing({ mealId, userId });
      if (path) done += 1;
      else failed.push(mealId);
    } catch (error) {
      console.error(`Symbol-Backfill fehlgeschlagen (${mealId}):`, error);
      failed.push(mealId);
    }
  }

  if (done > 0) {
    revalidateMealViews();
  }

  return {
    checked: meals.length,
    needed: targets.length,
    done,
    failed: failed.length,
    remaining: Math.max(0, targets.length - done),
  };
}
