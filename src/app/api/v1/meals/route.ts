import { NextResponse } from "next/server";
import { NO_STORE_HEADERS } from "@/lib/meal-cache";
import { prisma } from "@/lib/prisma";
import { requireRequestUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await requireRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const favoritesOnly = searchParams.get("favorites") === "1";
  const mealType = searchParams.get("mealType");
  const limitRaw = Number(searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(200, Math.max(1, Math.floor(limitRaw)))
    : 100;

  const allowedTypes = new Set(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]);
  const typeFilter =
    mealType && allowedTypes.has(mealType)
      ? { mealType: mealType as "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK" }
      : {};

  const meals = await prisma.meal.findMany({
    where: {
      userId: user.id,
      ...typeFilter,
      ...(favoritesOnly ? { isFavorite: true } : {}),
      ...(from || to
        ? {
            consumedAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: favoritesOnly
      ? [{ updatedAt: "desc" }, { consumedAt: "desc" }]
      : { consumedAt: "desc" },
    take: limit,
  });

  return NextResponse.json(
    { meals, count: meals.length },
    { headers: NO_STORE_HEADERS },
  );
}
