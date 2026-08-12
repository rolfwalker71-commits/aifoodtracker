import { saveMealImage } from "@/lib/uploads";
import { generateMealSymbolImage } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

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

/**
 * Use existing photo/URL, otherwise generate a cheap symbolic AI icon.
 * Generation failures are soft – meal can still be saved without image.
 */
export async function resolveMealImagePath(params: {
  userId: string;
  foodName: string;
  imagePath?: string | null;
}): Promise<string | null> {
  const raw = params.imagePath?.trim();
  if (raw) {
    return persistRemoteImage(raw, params.userId);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { openAiApiKey: true },
    });
    const buffer = await generateMealSymbolImage({
      foodName: params.foodName,
      encryptedUserKey: user?.openAiApiKey,
    });
    return await saveMealImage(buffer, params.userId);
  } catch (error) {
    console.error("Symbolbild-Generierung fehlgeschlagen:", error);
    return null;
  }
}
