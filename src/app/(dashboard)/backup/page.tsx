import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Download, ShieldAlert } from "lucide-react";
import { RestoreForm } from "@/features/backup/restore-form";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Backup Data",
};

export default async function BackupPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Backup Data</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Unduh seluruh data keuangan dalam satu file JSON, atau pulihkan dari
          backup sebelumnya.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-6">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-text-muted" aria-hidden="true" />
            <h2 className="text-base font-semibold text-text">Unduh backup</h2>
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            File berisi rekening, kategori, transaksi, anggaran, tabungan, dan
            transaksi rutin. Simpan file di tempat yang aman.
          </p>
          <a
            href="/api/backup"
            className="mt-4 inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-hover"
          >
            Unduh backup JSON
          </a>
        </section>

        <section className="card p-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-text-muted" aria-hidden="true" />
            <h2 className="text-base font-semibold text-text">Restore backup</h2>
          </div>
          <div className="mt-2">
            <RestoreForm />
          </div>
        </section>
      </div>
    </div>
  );
}
