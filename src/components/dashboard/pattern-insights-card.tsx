import { ScanSearch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PatternInsight } from "@/lib/insights";

export function PatternInsightsCard({ insights }: { insights: PatternInsight[] }) {
  if (!insights.length) return null;

  return (
    <Card className="animate-rise-delay">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ScanSearch className="h-4 w-4 text-primary" />
          Muster erkannt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => (
          <div key={insight.title} className="rounded-xl bg-muted/40 px-3 py-2.5">
            <p className="text-sm font-semibold">{insight.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{insight.body}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
