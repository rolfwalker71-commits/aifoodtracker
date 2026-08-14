"use client";

import { PUSH_MOTIFS, type PushKind } from "@/lib/push-motifs";
import { cn } from "@/lib/utils";

export function MotifCard({
  kind,
  className,
  caption,
}: {
  kind: PushKind;
  className?: string;
  caption?: string;
}) {
  const motif = PUSH_MOTIFS[kind];
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-muted",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={motif.image}
        alt=""
        className="aspect-video w-full object-cover"
      />
      {caption ? (
        <figcaption className="px-3 py-2 text-xs text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
