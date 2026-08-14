import { BrandMark } from "@/components/brand/brand-mark";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { OfflineQueueSync } from "@/components/meals/offline-queue-sync";
import { MissingImageBackfill } from "@/components/meals/missing-image-backfill";
import { ReminderScheduler } from "@/components/reminders/reminder-scheduler";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl overflow-x-clip">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-2.5">
            <BrandMark size="sm" className="md:hidden" />
            <div>
              <p className="font-display text-lg font-bold md:hidden">
                NutriSight
              </p>
              <p className="hidden text-sm text-muted-foreground md:block">
                Dein persönlicher Nährwert-Überblick
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>
        <main className="min-w-0 flex-1 px-4 py-5 pb-28 md:px-6 md:pb-8">
          {children}
        </main>
        <BottomNav />
        <OfflineQueueSync />
        <MissingImageBackfill />
        <ReminderScheduler />
      </div>
    </div>
  );
}
