import { CalendarRange, Leaf, Radar, Utensils } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import type { DayRestBudget } from "@/lib/day-plan";
import type { MicroWeekItem, WeekReview } from "@/lib/week-review";

export function DayRestBudgetCard({ budget }: { budget: DayRestBudget }) {
  return (
    <Card className="animate-rise border-primary/25 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Utensils className="h-4 w-4 text-primary" />
          Restbudget heute
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <BudgetTile
            label="kcal übrig"
            value={formatNumber(Math.max(0, budget.kcalLeft), 0)}
            warn={budget.overKcal}
            warnLabel={`+${formatNumber(Math.abs(budget.kcalLeft), 0)}`}
          />
          <BudgetTile
            label="Kohlenhydrate übrig"
            value={`${formatNumber(Math.max(0, budget.carbsLeft), 0)} g`}
          />
          <BudgetTile
            label="Protein übrig"
            value={`${formatNumber(Math.max(0, budget.proteinLeft), 0)} g`}
            className="col-span-2 sm:col-span-1"
          />
        </div>
        <div className="rounded-xl bg-background/80 px-3 py-3">
          <p className="text-sm font-semibold">{budget.suggestion.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {budget.suggestion.body}
          </p>
          <ul className="mt-3 space-y-2.5">
            {budget.suggestion.ideas.map((idea) => (
              <li
                key={`${idea.name}-${idea.amount}`}
                className="rounded-lg border border-border/60 bg-background/60 px-3 py-2.5"
              >
                <p className="text-sm font-medium leading-snug">{idea.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {idea.amount}
                </p>
                <p className="mt-1 text-xs font-medium tabular-nums text-foreground/90">
                  {formatNumber(idea.kcal, 0)} kcal ·{" "}
                  {formatNumber(idea.carbs, 0)} g Kohlenhydrate
                </p>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function BudgetTile({
  label,
  value,
  warn,
  warnLabel,
  className,
}: {
  label: string;
  value: string;
  warn?: boolean;
  warnLabel?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-background/80 px-3 py-2.5 ${className || ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums">
        {warn && warnLabel ? warnLabel : value}
      </p>
    </div>
  );
}

export function WeekReviewCard({ review }: { review: WeekReview }) {
  return (
    <Card className="animate-rise">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarRange className="h-4 w-4 text-primary" />
          {review.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{review.summary}</p>
        <ul className="space-y-2">
          {review.highlights.map((item) => (
            <li
              key={item}
              className="rounded-xl bg-muted/40 px-3 py-2.5 text-sm leading-snug"
            >
              {item}
            </li>
          ))}
        </ul>
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3">
          <p className="text-sm font-semibold">Fokus nächste Woche</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
            {review.nextFocus.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export function PatternRadarCard({
  items,
}: {
  items: { title: string; body: string }[];
}) {
  if (!items.length) return null;
  return (
    <Card className="animate-rise-delay">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Radar className="h-4 w-4 text-primary" />
          Muster-Radar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-xl bg-muted/40 px-3 py-2.5">
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function MicroWeekCard({ items }: { items: MicroWeekItem[] }) {
  if (!items.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Leaf className="h-4 w-4 text-primary" />
            Mikronährstoffe Woche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Diese Woche wirkst du bei den erfassten Mikros im Rahmen – oder es
            fehlen noch Daten.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-rise-delay">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Leaf className="h-4 w-4 text-primary" />
          Mikronährstoffe Woche
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Oft unter dem Tagesziel (Ø/Tag) – mit Lebensmittel-Hinweisen:
        </p>
        {items.map((item) => (
          <div key={item.key} className="rounded-xl bg-muted/40 px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-xs tabular-nums text-muted-foreground">
                Ø {formatNumber(item.avg, item.unit === "g" ? 0 : 0)} /{" "}
                {formatNumber(item.goal, 0)} {item.unit}
              </p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Ideen: {item.foodHints.join(" · ")}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
