import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { pushConfigured } from "@/lib/push";
import { requireUser } from "@/lib/session";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(10),
    auth: z.string().min(6),
  }),
});

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const count = await prisma.pushSubscription.count({
    where: { userId: user.id },
  });
  return NextResponse.json({
    configured: pushConfigured(),
    subscribed: count > 0,
    count,
  });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!pushConfigured()) {
    return NextResponse.json(
      { error: "Web Push ist nicht konfiguriert" },
      { status: 503 },
    );
  }

  const parsed = subscribeSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Subscription" }, { status: 400 });
  }

  const { endpoint, keys } = parsed.data;
  const userAgent = request.headers.get("user-agent")?.slice(0, 240) || null;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    },
    update: {
      userId: user.id,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const endpoint =
    typeof body.endpoint === "string" ? body.endpoint : undefined;
  if (endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { userId: user.id, endpoint },
    });
  } else {
    await prisma.pushSubscription.deleteMany({ where: { userId: user.id } });
  }
  return NextResponse.json({ ok: true });
}
