import { BrandMark } from "@/components/brand/brand-mark";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MissingImageBackfill } from "@/components/meals/missing-image-backfill";
import { DaySnapshotSync } from "@/components/offline/day-snapshot-sync";
import { OfflineStatusBanner } from "@/components/offline/offline-status-banner";
import { ReminderScheduler } from "@/components/reminders/reminder-scheduler";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-7xl overflow-x-clip">
      <Sidebar />
      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
        {/* Translucent bar: content scrolls under it and stays readable. */}
        <header className="glass-strong sticky top-0 z-30 flex items-center justify-between gap-3 rounded-none border-x-0 border-t-0 px-gutter py-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandMark size="sm" className="md:hidden" />
            <div className="min-w-0">
              <p className="font-display truncate text-lg font-bold md:hidden">
                NutriSight
              </p>
              <p className="hidden text-sm text-muted-foreground md:block">
                Dein persönlicher Nährwert-Überblick
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>
        <main className="min-w-0 flex-1 px-gutter py-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-10">
          <OfflineStatusBanner />
          {children}
        </main>
        <BottomNav />
        <DaySnapshotSync />
        <MissingImageBackfill />
        <ReminderScheduler />
      </div>
    </div>
  );
}
