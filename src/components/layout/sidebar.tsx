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
import { Button } from "@/components/ui/button";
import { isNavActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Start", icon: Home },
  { href: "/meals", label: "Mahlzeiten", icon: Utensils },
  { href: "/coach", label: "Coach", icon: Sparkles },
  { href: "/stats", label: "Statistiken", icon: ChartColumn },
  { href: "/settings", label: "Profil", icon: Settings },
];

/**
 * iPad / desktop rail. Sticky and self-scrolling so long pages never push the
 * navigation out of reach, and narrow enough (w-60) to leave the content column
 * a readable width in iPad portrait.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const showAdmin = Boolean(session?.user?.isAdmin);

  const itemClass = (active: boolean) =>
    cn(
      "glass-press flex min-h-12 items-center gap-3 rounded-2xl px-4 py-2.5 text-base font-semibold",
      active
        ? "sheen-fill bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(16_35_28/0.12),0_10px_24px_-12px_var(--primary)]"
        : "text-muted-foreground hover:bg-[var(--glass-tint-soft)] hover:text-foreground",
    );

  return (
    <aside className="hidden w-60 shrink-0 md:block lg:w-64">
      <div className="sticky top-0 flex max-h-screen flex-col gap-4 overflow-y-auto p-4 pl-safe pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="flex items-center gap-2.5 px-2 pt-1">
          <BrandMark size="md" />
          <div>
            <p className="font-display text-lg font-bold leading-none">
              NutriSight
            </p>
            <p className="text-xs text-muted-foreground">KI Nährwert-Tracker</p>
          </div>
        </div>

        <Button asChild size="lg" className="w-full justify-center">
          <Link href="/meals/new">
            <Camera className="h-5 w-5" />
            Erfassen
          </Link>
        </Button>

        <nav aria-label="Hauptnavigation" className="glass glass-sheen space-y-1 rounded-[1.5rem] p-2">
          {links.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={itemClass(active)}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            );
          })}
          {showAdmin ? (
            <Link
              href="/admin/users"
              className={itemClass(pathname.startsWith("/admin"))}
            >
              <Shield className="h-5 w-5 shrink-0" />
              Admin
            </Link>
          ) : null}
        </nav>
      </div>
    </aside>
  );
}
