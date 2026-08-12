import { NextResponse } from "next/server";
import { attachMealSymbolIfMissing } from "@/lib/images";
import { NO_STORE_HEADERS } from "@/lib/meal-cache";
import { requireUser } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

/** Background/on-demand symbol generation for meals without a photo. */
export async function POST(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const imagePath = await attachMealSymbolIfMissing({
      mealId: id,
      userId: user.id,
    });

    if (!imagePath) {
      return NextResponse.json(
        { error: "Mahlzeit nicht gefunden oder Bild fehlgeschlagen" },
        { status: 404 },
      );
    }

    return NextResponse.json({ imagePath }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Symbolbild konnte nicht erzeugt werden",
      },
      { status: 500 },
    );
  }
}
