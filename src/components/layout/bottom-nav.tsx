"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Home, Settings, Sparkles, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavActive } from "@/lib/nav";

const links = [
  { href: "/dashboard", label: "Start", icon: Home },
  { href: "/meals", label: "Liste", icon: Utensils },
  { href: "/meals/new", label: "Erfassen", icon: Camera, primary: true },
  { href: "/coach", label: "Coach", icon: Sparkles },
  { href: "/settings", label: "Profil", icon: Settings },
];

/**
 * Floating glass tab bar. It hovers above the content instead of sitting on a
 * bar edge, so the page scrolls visibly underneath it — that motion is what
 * makes the material read as glass rather than as a tinted rectangle.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Hauptnavigation"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 md:hidden"
    >
      <ul className="glass-strong glass-sheen pointer-events-auto mx-auto grid max-w-md grid-cols-5 gap-1 rounded-full p-1.5">
        {links.map(({ href, label, icon: Icon, primary }) => {
          const active = isNavActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "glass-press flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-full px-0.5 py-1 text-[0.6875rem] font-semibold leading-tight",
                  primary
                    ? "text-primary"
                    : active
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ease-out",
                    primary &&
                      "sheen-fill bg-primary text-primary-foreground shadow-[0_2px_6px_rgb(16_35_28/0.18),0_10px_22px_-8px_var(--primary)]",
                    primary && active && "scale-110",
                    !primary &&
                      active &&
                      "bg-[var(--glass-tint)] shadow-[inset_0_1px_0_0_var(--glass-highlight)]",
                  )}
                >
                  <Icon className="h-[1.125rem] w-[1.125rem]" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
