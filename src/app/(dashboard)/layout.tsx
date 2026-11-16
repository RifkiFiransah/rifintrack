import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Bell, Wallet } from "lucide-react";
import { BottomNav, SidebarNav } from "@/components/layout/nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { UserMenu } from "@/features/auth/user-menu";
import { OfflineSync } from "@/features/pwa/offline-sync";
import { getSession } from "@/lib/auth";
import { getFirstName } from "@/lib/user";
import { countUnreadNotifications } from "@/services/notification.service";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const unreadCount = await countUnreadNotifications(session.user.id);

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border/70 bg-surface/75 backdrop-blur-xl md:flex">
        <div className="flex h-16 items-center border-b border-border/70 px-4">
          <Link href="/dashboard" className="group flex items-center gap-3">
            <span className="bg-brand flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-brand transition group-hover:scale-105">
              <Wallet className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight text-text">
                RiFinTrack
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-text-muted">
                Personal finance
              </span>
            </span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav />
        </div>
        <div className="border-t border-border/70 px-4 py-4">
          <div className="flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-2.5">
            <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_0_4px_var(--color-success-soft)]" />
            <span className="text-xs font-medium text-text-secondary">
              Keuangan pribadi
            </span>
          </div>
        </div>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-10 border-b border-border/70 bg-surface/80 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 md:hidden"
            >
              <span className="bg-brand flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm">
                <Wallet
                  className="h-4 w-4"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </span>
              <span className="text-sm font-semibold tracking-tight text-text">
                RiFinTrack
              </span>
            </Link>
            <div className="hidden md:block">
              <p className="text-xs text-text-muted">Selamat datang kembali</p>
              <p className="text-sm font-semibold text-text">
                {getFirstName(session.user.fullName)}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <Link
                href="/notifications"
                aria-label={
                  unreadCount > 0
                    ? `Notifikasi, ${unreadCount} belum dibaca`
                    : "Notifikasi"
                }
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface/80 text-text-secondary shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface hover:text-text"
              >
                <Bell
                  className="h-5 w-5"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-5 text-white shadow-sm dark:text-background">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </Link>
              {/* <span className="hidden max-w-32 truncate text-sm text-text-secondary xl:inline">
                {session.user.fullName}
              </span> */}
              <UserMenu
                fullName={session.user.fullName}
                email={session.user.email}
              />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 md:pb-10">
          <OfflineSync />
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
