import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Liquid-glass surface. `variant="solid"` opts out of the material for places
 * that sit on top of another glass pane, where stacking two blurs turns muddy.
 */
function Card({
  className,
  variant = "glass",
  ...props
}: React.ComponentProps<"div"> & { variant?: "glass" | "solid" }) {
  return (
    <div
      className={cn(
        "rounded-2xl text-card-foreground",
        variant === "glass"
          ? "glass glass-sheen"
          : "border border-border/80 bg-card shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-1.5 p-5 pb-3", className)} {...props} />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn(
        "text-lg font-bold tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
