"use client";

import { PUSH_MOTIFS, type PushKind } from "@/lib/push-motifs";
import { cn } from "@/lib/utils";

type MotifSize = "thumb" | "tile";

export function MotifCard({
  kind,
  className,
  caption,
  size = "thumb",
}: {
  kind: PushKind;
  className?: string;
  caption?: string;
  size?: MotifSize;
}) {
  const motif = PUSH_MOTIFS[kind];
  return (
    <figure
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border border-border bg-muted",
        size === "thumb" && "h-14 w-20 shrink-0 sm:h-16 sm:w-24",
        size === "tile" && "h-24 w-full max-w-48 sm:h-28",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={motif.image}
        alt=""
        width={160}
        height={90}
        className="h-full w-full max-w-none object-cover"
      />
      {caption ? (
        <figcaption className="sr-only">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
