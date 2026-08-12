import { revalidatePath } from "next/cache";

/** Invalidate all meal-dependent views after create/update/delete. */
export function revalidateMealViews(mealId?: string) {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/meals", "layout");
  revalidatePath("/stats", "layout");
  revalidatePath("/coach", "layout");
  if (mealId) {
    revalidatePath(`/meals/${mealId}`, "page");
  }
}

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
} as const;
