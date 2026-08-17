"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  src?: string | null;
  alt?: string;
  name?: string | null;
  className?: string;
};

/** Shows an initial when the media file is missing (broken link after deploy). */
export function UserAvatar({ src, alt = "", name, className }: Props) {
  const [failed, setFailed] = useState(false);
  const initial = (name?.trim()?.[0] || "?").toUpperCase();
  if (!src || failed) {
    return (
      <div
        aria-hidden
        className={cn(
          "flex items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary",
          className,
        )}
      >
        {initial}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("rounded-full object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
