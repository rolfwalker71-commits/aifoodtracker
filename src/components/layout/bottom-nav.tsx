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

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5 gap-0.5 px-1 py-1.5">
        {links.map(({ href, label, icon: Icon, primary }) => {
          const active = isNavActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[11px] font-semibold leading-tight transition-colors",
                  primary
                    ? "text-primary"
                    : active
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full transition-transform",
                    primary &&
                      "bg-primary text-primary-foreground shadow-md shadow-primary/30",
                    primary && active && "scale-105",
                    !primary && active && "bg-accent",
                  )}
                >
                  <Icon className="h-[18px] w-[18px] stroke-[2.5]" />
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
