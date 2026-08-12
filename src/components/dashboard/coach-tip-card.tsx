import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CoachTip } from "@/lib/coach-tip";

const toneClass: Record<CoachTip["tone"], string> = {
  neutral: "border-border/70 bg-card",
  positive: "border-emerald-500/30 bg-emerald-500/10",
  attention: "border-amber-500/40 bg-amber-500/10",
};

export function CoachTipCard({ tip }: { tip: CoachTip }) {
  return (
    <Card className={cn("animate-rise", toneClass[tip.tone])}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Tages-Coach · {tip.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-foreground/90">{tip.body}</p>
      </CardContent>
    </Card>
  );
}
