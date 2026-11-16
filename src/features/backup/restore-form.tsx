"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

type RestoreCounts = {
  accounts: number;
  categories: number;
  transactions: number;
  budgets: number;
  savingsGoals: number;
  recurringRules: number;
};

export function RestoreForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError(null);
    setMessage(null);

    if (!file) {
      setError("Pilih file backup terlebih dahulu.");
      return;
    }

    if (
      !window.confirm(
        "Restore akan menghapus dan mengganti seluruh data keuangan akun ini. Lanjutkan?",
      )
    ) {
      return;
    }

    setPending(true);

    try {
      const text = await file.text();
      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; restored?: RestoreCounts }
        | null;

      if (!response.ok) {
        setError(data?.error ?? "Gagal memulihkan data.");
        return;
      }

      const restored = data?.restored;
      setMessage(
        restored
          ? `Data dipulihkan: ${restored.accounts} rekening, ${restored.categories} kategori, ${restored.transactions} transaksi, ${restored.budgets} anggaran, ${restored.savingsGoals} tujuan tabungan, ${restored.recurringRules} transaksi rutin.`
          : "Data berhasil dipulihkan.",
      );
      setFile(null);
      form.reset();
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server atau file tidak valid.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="backup-file" className="block text-sm font-medium text-text">
          File backup JSON
        </label>
        <input
          id="backup-file"
          type="file"
          accept="application/json,.json"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full cursor-pointer rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-secondary file:mr-3 file:rounded-sm file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-sm file:text-text"
        />
        <p className="text-xs text-text-muted">
          Restore mengganti seluruh data keuangan dengan isi file backup. Data
          yang ada saat ini akan dihapus.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl bg-success-soft px-3 py-2 text-sm text-success-text">
          {message}
        </p>
      ) : null}

      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Memulihkan..." : "Restore backup"}
      </Button>
    </form>
  );
}
