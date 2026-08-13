import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { forbidden, requireAdmin, unauthorized } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  password: z.string().min(6).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const sessionUser = await requireUser();
  if (!sessionUser) return unauthorized();
  const admin = await requireAdmin();
  if (!admin) return forbidden();

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
  }

  if (target.id === admin.id && parsed.data.isActive === false) {
    return NextResponse.json(
      { error: "Du kannst dich nicht selbst deaktivieren" },
      { status: 400 },
    );
  }

  if (target.id === admin.id && parsed.data.role === "USER") {
    return NextResponse.json(
      { error: "Du kannst dir die Admin-Rolle nicht selbst entziehen" },
      { status: 400 },
    );
  }

  if (parsed.data.role === "USER" && target.role === "ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", id: { not: target.id }, isActive: true },
    });
    if (otherAdmins === 0) {
      return NextResponse.json(
        { error: "Mindestens ein aktiver Admin muss bleiben" },
        { status: 400 },
      );
    }
  }

  const data: {
    isActive?: boolean;
    role?: "USER" | "ADMIN";
    passwordHash?: string;
  } = {};
  if (typeof parsed.data.isActive === "boolean") {
    data.isActive = parsed.data.isActive;
  }
  if (parsed.data.role) data.role = parsed.data.role;
  if (parsed.data.password) {
    data.passwordHash = await hash(parsed.data.password, 12);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
    },
  });

  return NextResponse.json({ user });
}
