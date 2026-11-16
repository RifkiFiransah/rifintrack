"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatPercent, formatRupiah, parseRupiahInput } from "@/lib/money";
import type { BudgetView } from "@/services/budget.service";
import type { CategoryView } from "@/services/category.service";

function barTone(share: number) {
  if (share > 1) return "bg-danger";
  if (share >= 0.8) return "bg-warning";
  return "bg-success";
}

function statusBadge(share: number) {
  if (share > 1) return <Badge tone="danger">Melebihi anggaran</Badge>;
  if (share >= 0.8) return <Badge tone="warning">Mendekati batas</Badge>;
  return <Badge tone="success">Aman</Badge>;
}

export function BudgetManager({
  budget,
  categories,
  year,
  month,
  monthLabel,
}: {
  budget: BudgetView | null;
  categories: CategoryView[];
  year: number;
  month: number;
  monthLabel: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");

  const previous =
    month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };

  async function request(path: string, init: RequestInit) {
    setError(null);
    setPending(true);

    try {
      const response = await fetch(path, init);
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setError(data?.error ?? "Terjadi kesalahan.");
        return false;
      }

      router.refresh();
      return true;
    } catch {
      setError("Tidak dapat terhubung ke server.");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await request("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Anggaran ${monthLabel}`,
        year,
        month,
      }),
    });
  }

  async function handleCopy() {
    await request("/api/budgets/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromYear: previous.year,
        fromMonth: previous.month,
        toYear: year,
        toMonth: month,
      }),
    });
  }

  async function handleLimitSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!budget) return;

    if (!categoryId) {
      setError("Pilih kategori terlebih dahulu.");
      return;
    }

    const limitAmount = parseRupiahInput(amount);

    const ok = await request(`/api/budgets/${budget.id}/limits`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, limitAmount }),
    });

    if (ok) {
      setCategoryId("");
      setAmount("");
    }
  }

  async function handleDeleteLimit(itemCategoryId: string) {
    if (!budget) return;
    if (!window.confirm("Hapus limit kategori ini?")) return;

    await request(
      `/api/budgets/${budget.id}/limits/${itemCategoryId}`,
      { method: "DELETE" },
    );
  }

  function handleEdit(categoryIdValue: string, limit: number) {
    setCategoryId(categoryIdValue);
    setAmount(String(limit));
  }

  if (!budget) {
    return (
      <div className="card p-6">
        <h2 className="text-base font-semibold text-text">
          Belum ada anggaran untuk {monthLabel}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Buat anggaran untuk memantau pengeluaran per kategori.
        </p>

        {error ? (
          <p className="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          <form onSubmit={handleCreate}>
            <Button type="submit" disabled={pending}>
              {pending ? "Memproses..." : "Buat anggaran"}
            </Button>
          </form>
          <Button type="button" variant="secondary" disabled={pending} onClick={handleCopy}>
            Salin dari bulan sebelumnya
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-text">{budget.name}</h2>
              {statusBadge(budget.share)}
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              {formatRupiah(budget.totalSpent)} dari{" "}
              {formatRupiah(budget.totalLimit)} • sisa{" "}
              {formatRupiah(budget.totalRemaining)}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={handleCopy}
          >
            Salin dari bulan sebelumnya
          </Button>
        </div>

        <div className="mt-3 h-2.5 overflow-hidden rounded-sm bg-surface-muted">
          <div
            className={`h-full rounded-sm ${barTone(budget.share)}`}
            style={{ width: `${Math.min(100, budget.share * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-text-secondary">
          {formatPercent(budget.share)} terpakai
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <form
          onSubmit={handleLimitSubmit}
          className="space-y-4 self-start card p-6"
        >
          <h2 className="text-sm font-semibold text-text">Atur limit kategori</h2>

          {error ? (
            <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="budget-category" className="block text-sm font-medium text-text">
              Kategori
            </label>
            <Select
              id="budget-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">Pilih kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="budget-amount" className="block text-sm font-medium text-text">
              Limit
            </label>
            <Input
              id="budget-amount"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Menyimpan..." : "Simpan limit"}
          </Button>
        </form>

        <div className="card">
          <h2 className="border-b border-border px-6 py-4 text-sm font-semibold text-text">
            Realisasi per kategori
          </h2>

          {budget.items.length === 0 ? (
            <p className="px-6 py-8 text-sm text-text-secondary">
              Belum ada limit kategori. Tambahkan limit untuk mulai memantau.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {budget.items.map((item) => (
                <li key={item.categoryId} className="px-6 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-text">
                          {item.categoryName}
                        </p>
                        {item.share > 1 ? (
                          <Badge tone="danger">Lewat</Badge>
                        ) : item.share >= 0.8 ? (
                          <Badge tone="warning">Hampir</Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {formatRupiah(item.spent)} / {formatRupiah(item.limit)} •{" "}
                        {formatPercent(item.share)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 px-3 text-xs"
                        disabled={pending}
                        onClick={() => handleEdit(item.categoryId, item.limit)}
                      >
                        Ubah
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 px-3 text-xs"
                        disabled={pending}
                        onClick={() => handleDeleteLimit(item.categoryId)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-surface-muted">
                    <div
                      className={`h-full rounded-sm ${barTone(item.share)}`}
                      style={{ width: `${Math.min(100, item.share * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
