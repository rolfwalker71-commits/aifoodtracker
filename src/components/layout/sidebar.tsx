"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Camera,
  ChartColumn,
  Home,
  Settings,
  Utensils,
} from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Start", icon: Home },
  { href: "/meals", label: "Mahlzeiten", icon: Utensils },
  { href: "/meals/new", label: "Erfassen", icon: Camera },
  { href: "/stats", label: "Statistiken", icon: ChartColumn },
  { href: "/settings", label: "Benutzer", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border/70 bg-card/40 p-5 md:flex md:flex-col">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <BrandMark size="md" />
        <div>
          <p className="font-display text-lg font-bold leading-none">
            NutriSight
          </p>
          <p className="text-xs text-muted-foreground">KI Nährwert-Tracker</p>
        </div>
      </div>
      <nav className="space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
