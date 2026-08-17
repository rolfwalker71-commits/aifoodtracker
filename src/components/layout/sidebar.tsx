"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Camera,
  ChartColumn,
  Home,
  Settings,
  Shield,
  Sparkles,
  Utensils,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { BrandMark } from "@/components/brand/brand-mark";
import { isNavActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Start", icon: Home },
  { href: "/meals", label: "Mahlzeiten", icon: Utensils },
  { href: "/meals/new", label: "Erfassen", icon: Camera },
  { href: "/coach", label: "Coach", icon: Sparkles },
  { href: "/stats", label: "Statistiken", icon: ChartColumn },
  { href: "/settings", label: "Profil", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const showAdmin = Boolean(session?.user?.isAdmin);

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
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-3 text-[17px] font-bold transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-[19px] w-[19px] stroke-[2.5]" />
              {label}
            </Link>
          );
        })}
        {showAdmin ? (
          <Link
            href="/admin/users"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-3 text-[17px] font-bold transition-colors",
              pathname.startsWith("/admin")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Shield className="h-[19px] w-[19px] stroke-[2.5]" />
            Admin
          </Link>
        ) : null}
      </nav>
    </aside>
  );
}
