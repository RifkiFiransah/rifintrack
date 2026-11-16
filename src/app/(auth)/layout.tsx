import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CheckCircle2, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export const metadata: Metadata = {
  title: "Akun",
};

const HIGHLIGHTS = [
  "Catat pemasukan, pengeluaran, dan transfer dengan cepat.",
  "Pantau anggaran serta target tabungan dalam satu dasbor.",
  "Lihat laporan dan insight, lalu export ke CSV, Excel, atau PDF.",
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <ThemeToggle className="fixed right-4 top-4 z-20" />

      <div className="relative mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <section className="hidden lg:block">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="bg-brand flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-brand">
              <Wallet className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-tight text-text">
                RiFinTrack
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-text-muted">
                Personal finance
              </span>
            </span>
          </Link>

          <h1 className="mt-10 max-w-xl text-4xl font-bold leading-tight tracking-tight text-text">
            Kelola uangmu dengan lebih tenang dan terarah.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-text-secondary">
            Satu tempat untuk mencatat transaksi, menjaga anggaran, dan melihat
            ke mana uangmu pergi setiap bulan.
          </p>

          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-text-secondary">
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-success"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex items-center gap-3 rounded-2xl border border-border/70 bg-surface/60 px-4 py-3 text-xs text-text-secondary shadow-card backdrop-blur">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-success-soft text-success-text">
              <ShieldCheck className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="flex-1">
              Data keuanganmu tersimpan per akun dan tidak dibagikan ke pengguna lain.
            </span>
            <TrendingUp className="h-5 w-5 text-text-muted" aria-hidden="true" />
          </div>
        </section>

        <section className="w-full max-w-md justify-self-center">
          <Link href="/" className="mb-6 flex items-center gap-2 lg:hidden">
            <span className="bg-brand flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-brand">
              <Wallet className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="text-base font-semibold tracking-tight text-text">
              RiFinTrack
            </span>
          </Link>

          <div className="card p-6 sm:p-8">{children}</div>

          <p className="mt-6 text-center text-xs text-text-muted">
            Aman, privat, dan hanya untukmu.
          </p>
        </section>
      </div>
    </main>
  );
}
