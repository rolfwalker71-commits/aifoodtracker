import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { buildPushPayload, type PushKind } from "@/lib/push-motifs";
import { sendPushToUser } from "@/lib/push";

const schema = z.object({
  kind: z.enum(["breakfast", "lunch", "dinner", "snack", "rest", "weight"]),
});

const COPY: Record<PushKind, { title: string; body: string; url: string }> = {
  breakfast: {
    title: "Frühstück eintragen?",
    body: "Test: Motivkarte Frühstück.",
    url: "/meals/new",
  },
  lunch: {
    title: "Mittagessen eintragen?",
    body: "Test: Motivkarte Mittag.",
    url: "/meals/new",
  },
  dinner: {
    title: "Abendessen eintragen?",
    body: "Test: Motivkarte Abend.",
    url: "/meals/new",
  },
  snack: {
    title: "Snack eintragen?",
    body: "Test: Motivkarte Snack.",
    url: "/meals/new",
  },
  rest: {
    title: "Abend-Coach",
    body: "Test: Motivkarte Restbudget.",
    url: "/coach",
  },
  weight: {
    title: "Gewicht checken",
    body: "Test: Motivkarte Waage.",
    url: "/dashboard#gewicht",
  },
};

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Art" }, { status: 400 });
  }
  const kind = parsed.data.kind;
  const copy = COPY[kind];
  const result = await sendPushToUser(
    user.id,
    buildPushPayload(kind, copy.title, copy.body, copy.url, `test-${kind}`),
  );
  if (!result.sent) {
    return NextResponse.json(
      { error: "Kein Gerät mit Push – zuerst «Push aktivieren»." },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, ...result });
}
