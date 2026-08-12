import { NextResponse } from "next/server";
import { fetchOpenFoodFactsByBarcode } from "@/lib/openfoodfacts";
import { requireUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") || searchParams.get("barcode") || "").trim();
  if (!code) {
    return NextResponse.json({ error: "Barcode fehlt" }, { status: 400 });
  }

  try {
    const item = await fetchOpenFoodFactsByBarcode(code);
    if (!item) {
      return NextResponse.json(
        {
          error:
            "Kein Produkt in Open Food Facts gefunden. Code prüfen oder Freitext/Suche nutzen.",
        },
        { status: 404 },
      );
    }
    return NextResponse.json({ item });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Barcode-Abfrage fehlgeschlagen",
      },
      { status: 500 },
    );
  }
}
