import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Database, FileText, Lightbulb, Repeat, Tags, Wallet } from "lucide-react";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Lainnya",
};

const LINKS = [
  {
    href: "/accounts",
    label: "Rekening",
    description: "Kelola rekening bank, dompet digital, dan tunai.",
    icon: Wallet,
  },
  {
    href: "/categories",
    label: "Kategori",
    description: "Atur kategori pemasukan dan pengeluaran.",
    icon: Tags,
  },
  {
    href: "/recurring",
    label: "Transaksi Rutin",
    description: "Atur tagihan dan pemasukan berulang.",
    icon: Repeat,
  },
  {
    href: "/insights",
    label: "Insight",
    description: "Analisis pengeluaran dan rekomendasi keuangan.",
    icon: Lightbulb,
  },
  {
    href: "/reports",
    label: "Laporan",
    description: "Lihat laporan harian, mingguan, bulanan, dan tahunan.",
    icon: FileText,
  },
  {
    href: "/backup",
    label: "Backup Data",
    description: "Unduh atau pulihkan seluruh data keuangan.",
    icon: Database,
  },
];

export default async function MorePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Lainnya</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Modul lain RiFinTrack.
        </p>
      </div>

      <ul className="divide-y divide-border overflow-hidden card">
        {LINKS.map(({ href, label, description, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-center gap-4 px-5 py-4 transition hover:bg-surface-muted"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-text">
                  {label}
                </span>
                <span className="block text-xs text-text-secondary">
                  {description}
                </span>
              </span>
              <ChevronRight
                className="h-5 w-5 text-text-muted"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
