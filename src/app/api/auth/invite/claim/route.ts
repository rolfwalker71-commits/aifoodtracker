import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  hashInviteCode,
  normalizeInviteCode,
} from "@/lib/invitations";
import { prisma } from "@/lib/prisma";

const claimSchema = z.object({
  code: z.string().min(4).max(32),
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = claimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültige Einladungsdaten" },
        { status: 400 },
      );
    }

    const code = normalizeInviteCode(parsed.data.code);
    const codeHash = hashInviteCode(code);
    const email = parsed.data.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "E-Mail ist bereits registriert – bitte einloggen" },
        { status: 409 },
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { codeHash },
    });
    if (!invitation || invitation.usedAt) {
      return NextResponse.json(
        { error: "Einladungscode ungültig oder bereits verwendet" },
        { status: 400 },
      );
    }
    if (invitation.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Einladungscode ist abgelaufen" },
        { status: 400 },
      );
    }

    const passwordHash = await hash(parsed.data.password, 12);
    const name = parsed.data.name?.trim() || email.split("@")[0];

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: "USER",
          isActive: true,
        },
        select: { id: true, email: true, name: true },
      });
      const consumed = await tx.invitation.updateMany({
        where: { id: invitation.id, usedAt: null },
        data: {
          usedAt: new Date(),
          usedById: created.id,
        },
      });
      if (consumed.count !== 1) {
        throw new Error("INVITE_RACE");
      }
      return created;
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVITE_RACE") {
      return NextResponse.json(
        { error: "Einladungscode wurde gerade verwendet" },
        { status: 409 },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Einladung konnte nicht eingelöst werden" },
      { status: 500 },
    );
  }
}
