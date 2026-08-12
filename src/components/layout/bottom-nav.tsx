"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, ChartColumn, Home, Settings, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/meals", label: "Mahlzeiten", icon: Utensils },
  { href: "/meals/new", label: "Erfassen", icon: Camera, primary: true },
  { href: "/stats", label: "Stats", icon: ChartColumn },
  { href: "/settings", label: "Benutzer", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5 gap-1 px-2 py-2">
        {links.map(({ href, label, icon: Icon, primary }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors",
                  primary
                    ? "text-primary"
                    : active
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-transform",
                    primary &&
                      "bg-primary text-primary-foreground shadow-md shadow-primary/30",
                    primary && active && "scale-105",
                    !primary && active && "bg-accent",
                  )}
                >
                  <Icon className="h-4 w-4" />
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
