import { NextResponse } from "next/server";
import { backfillMissingMealSymbols } from "@/lib/images";
import { NO_STORE_HEADERS } from "@/lib/meal-cache";
import { requireUser } from "@/lib/session";

/**
 * Generate AI symbol images for meals with missing/deleted upload files.
 * Safe to call repeatedly; only processes broken/empty images.
 */
export async function POST() {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await backfillMissingMealSymbols(user.id, {
      limit: 5,
      checkTake: 200,
    });
    return NextResponse.json(result, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Backfill fehlgeschlagen",
      },
      { status: 500 },
    );
  }
}
