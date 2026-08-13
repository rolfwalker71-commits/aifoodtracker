import { NextResponse } from "next/server";

/** Open self-registration is disabled — use /invite with a code. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Selbstregistrierung ist deaktiviert. Bitte Einladungscode unter /invite verwenden.",
    },
    { status: 403 },
  );
}
