import { NextResponse } from "next/server";
import { NO_STORE_HEADERS } from "@/lib/meal-cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.apiAccessKey.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  await prisma.apiAccessKey.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
