import { NextResponse } from "next/server";
import { forbidden, requireAdmin, unauthorized } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET() {
  const sessionUser = await requireUser();
  if (!sessionUser) return unauthorized();
  const admin = await requireAdmin();
  if (!admin) return forbidden();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: { select: { meals: true } },
    },
  });

  return NextResponse.json({ users });
}
