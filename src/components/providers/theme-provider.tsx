"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * next-themes injects an inline <script> to prevent theme flash (FOUC).
 * React 19 / Next 16 flag that as a console error inside client components.
 * The script still runs correctly during SSR — this filter only removes the
 * noisy (and blocking) dev overlay. Same workaround as the shadcn dark-mode guide.
 */
if (process.env.NODE_ENV === "development") {
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    const first = args[0];
    if (
      typeof first === "string" &&
      first.includes("Encountered a script tag")
    ) {
      return;
    }
    orig.apply(console, args);
  };
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
