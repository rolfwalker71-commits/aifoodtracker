import { NextResponse } from "next/server";
import { dispatchDuePushes } from "@/lib/push-dispatch";
import { pushConfigured } from "@/lib/push";
import { runtimeEnv } from "@/lib/runtime-env";

function authorized(request: Request) {
  const secret = runtimeEnv("CRON_SECRET");
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const query = new URL(request.url).searchParams.get("secret") || "";
  return bearer === secret || query === secret;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!pushConfigured()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no-vapid" });
  }
  const result = await dispatchDuePushes();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return POST(request);
}
