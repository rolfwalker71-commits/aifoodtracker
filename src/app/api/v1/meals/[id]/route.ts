import { NextResponse } from "next/server";
import { NO_STORE_HEADERS } from "@/lib/meal-cache";
import { prisma } from "@/lib/prisma";
import { requireRequestUser } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const meal = await prisma.meal.findFirst({
    where: { id, userId: user.id },
  });
  if (!meal) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json({ meal }, { headers: NO_STORE_HEADERS });
}
