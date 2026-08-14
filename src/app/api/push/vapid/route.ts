import { NextResponse } from "next/server";
import { pushConfigured, vapidPublicKey } from "@/lib/push";

export async function GET() {
  if (!pushConfigured()) {
    return NextResponse.json({ configured: false, publicKey: "" });
  }
  return NextResponse.json({
    configured: true,
    publicKey: vapidPublicKey(),
  });
}
