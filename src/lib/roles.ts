import type { UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export function parseAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Promote configured emails to ADMIN. If no admin exists yet, promote the
 * oldest user once so the install is never locked out.
 */
export async function ensureAdminBootstrap(): Promise<void> {
  const emails = parseAdminEmails();
  if (emails.length > 0) {
    await prisma.user.updateMany({
      where: { email: { in: emails } },
      data: { role: "ADMIN" },
    });
  }

  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminCount > 0) return;

  const first = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (first) {
    await prisma.user.update({
      where: { id: first.id },
      data: { role: "ADMIN" },
    });
  }
}

export function isAdminRole(role: UserRole | string | null | undefined) {
  return role === "ADMIN";
}
