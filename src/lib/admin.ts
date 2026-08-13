import { NextResponse } from "next/server";
import { ensureAdminBootstrap, isAdminRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function requireAdmin() {
  const user = await requireUser();
  if (!user) return null;
  await ensureAdminBootstrap();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  if (!dbUser?.isActive || !isAdminRole(dbUser.role)) return null;
  return dbUser;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
