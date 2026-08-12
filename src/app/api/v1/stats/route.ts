import { NextResponse } from "next/server";
import { NO_STORE_HEADERS } from "@/lib/meal-cache";
import { requireRequestUser } from "@/lib/session";
import { getStatsForUser } from "@/lib/stats";
import type { StatsRange } from "@/types/meals";

export async function GET(request: Request) {
  const user = await requireRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rangeParam = searchParams.get("range") ?? "day";
  const range = (
    ["day", "week", "month"].includes(rangeParam) ? rangeParam : "day"
  ) as StatsRange;

  const stats = await getStatsForUser(user.id, range);
  return NextResponse.json(stats, { headers: NO_STORE_HEADERS });
}
