import { NextResponse } from "next/server";
import { z } from "zod";
import {
  generateInviteCode,
  inviteExpiresAt,
  INVITE_TTL_DAYS,
} from "@/lib/invitations";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const createSchema = z.object({
  note: z.string().max(120).optional(),
});

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invitations = await prisma.invitation.findMany({
    where: { createdById: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      codePrefix: true,
      note: true,
      expiresAt: true,
      usedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ invitations, ttlDays: INVITE_TTL_DAYS });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
  }

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isActive: true },
  });
  if (!me?.isActive) {
    return NextResponse.json({ error: "Konto deaktiviert" }, { status: 403 });
  }

  const { rawCode, codeHash, codePrefix } = generateInviteCode();
  const invitation = await prisma.invitation.create({
    data: {
      codeHash,
      codePrefix,
      createdById: user.id,
      expiresAt: inviteExpiresAt(),
      note: parsed.data.note?.trim() || null,
    },
    select: {
      id: true,
      codePrefix: true,
      note: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    {
      invitation,
      code: rawCode,
      ttlDays: INVITE_TTL_DAYS,
    },
    { status: 201 },
  );
}
