"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
};

/** Hides itself when the media file is missing (broken link after deploy). */
export function UserAvatar({ src, alt = "", className }: Props) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;

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
