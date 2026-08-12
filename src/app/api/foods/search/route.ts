import { NextResponse } from "next/server";
import { searchOpenFoodFacts } from "@/lib/openfoodfacts";
import { requireUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();
  if (query.length < 2) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await searchOpenFoodFacts(query, 8);
    return NextResponse.json({
      items,
      source: "openfoodfacts",
      hint:
        items.length === 0
          ? "Keine Markenprodukte gefunden. Du kannst die KI-Schätzung nutzen."
          : undefined,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Lebensmittelsuche fehlgeschlagen",
      },
      { status: 500 },
    );
  }
}
