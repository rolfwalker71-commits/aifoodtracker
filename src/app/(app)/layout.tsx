import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl md:px-6">
          <div>
            <p className="font-display text-lg font-bold md:hidden">
              NutriSight
            </p>
            <p className="hidden text-sm text-muted-foreground md:block">
              Dein persönliches Nährwert-Dashboard
            </p>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 px-4 py-5 pb-28 md:px-6 md:pb-8">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
