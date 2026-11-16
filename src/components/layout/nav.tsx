"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Bell,
  FileText,
  LayoutDashboard,
  Lightbulb,
  Menu,
  PiggyBank,
  Repeat,
  Tags,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon };

const SIDEBAR_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transaksi", icon: ArrowLeftRight },
  { href: "/accounts", label: "Rekening", icon: Wallet },
  { href: "/categories", label: "Kategori", icon: Tags },
  { href: "/budgets", label: "Anggaran", icon: Target },
  { href: "/savings", label: "Tabungan", icon: PiggyBank },
  { href: "/recurring", label: "Transaksi Rutin", icon: Repeat },
  { href: "/insights", label: "Insight", icon: Lightbulb },
  { href: "/notifications", label: "Notifikasi", icon: Bell },
  { href: "/reports", label: "Laporan", icon: FileText },
  { href: "/more", label: "Lainnya", icon: Menu },
];

const BOTTOM_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transaksi", icon: ArrowLeftRight },
  { href: "/budgets", label: "Anggaran", icon: Target },
  { href: "/savings", label: "Tabungan", icon: PiggyBank },
  { href: "/more", label: "Lainnya", icon: Menu },
];

function createActiveMatcher(pathname: string) {
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();
  const isActive = createActiveMatcher(pathname);

  return (
    <nav className="space-y-1.5" aria-label="Navigasi utama">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
        Menu
      </p>
      {SIDEBAR_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-brand text-white shadow-brand dark:bg-primary-soft dark:text-primary dark:shadow-none"
                : "text-text-secondary hover:bg-surface-muted hover:text-text"
            }`}
          >
            <Icon
              className={`h-5 w-5 transition ${
                active
                  ? "text-white dark:text-primary"
                  : "text-text-muted group-hover:text-primary"
              }`}
              strokeWidth={1.8}
              aria-hidden="true"
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const isActive = createActiveMatcher(pathname);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-surface/85 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_-24px_rgba(15,23,42,0.5)] backdrop-blur-xl md:hidden"
      aria-label="Navigasi bawah"
    >
      <div className="grid grid-cols-5">
        {BOTTOM_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition ${
                active ? "text-primary" : "text-text-secondary"
              }`}
            >
              <span
                className={`inline-flex h-8 w-11 items-center justify-center rounded-xl transition ${
                  active ? "bg-primary-soft text-primary" : "text-text-muted"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
