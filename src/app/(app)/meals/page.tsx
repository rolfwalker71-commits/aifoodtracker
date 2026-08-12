import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { MealList } from "@/components/meals/meal-list";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MealsPage() {
  noStore();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const meals = await prisma.meal.findMany({
    where: { userId: session.user.id },
    orderBy: { consumedAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Mahlzeiten
        </h1>
        <p className="text-sm text-muted-foreground">
          Deine letzten Einträge im Überblick
        </p>
      </div>
      <MealList
        meals={meals.map((meal) => ({
          ...meal,
          consumedAt: meal.consumedAt.toISOString(),
        }))}
      />
    </div>
  );
}
