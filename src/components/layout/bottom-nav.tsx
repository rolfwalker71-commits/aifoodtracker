"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Camera,
  ChartColumn,
  Home,
  Settings,
  Sparkles,
  Utensils,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Start", icon: Home },
  { href: "/meals", label: "Mahlzeiten", icon: Utensils },
  { href: "/meals/new", label: "Erfassen", icon: Camera, primary: true },
  { href: "/coach", label: "Coach", icon: Sparkles },
  { href: "/stats", label: "Statistiken", icon: ChartColumn },
  { href: "/settings", label: "Benutzer", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-6 gap-0.5 px-1 py-2">
        {links.map(({ href, label, icon: Icon, primary }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 text-[10px] font-semibold transition-colors",
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
                  <Icon className="h-[17px] w-[17px] stroke-[2.5]" />
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
