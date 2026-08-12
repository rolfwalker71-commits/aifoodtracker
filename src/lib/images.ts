import { saveMealImage } from "@/lib/uploads";

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
