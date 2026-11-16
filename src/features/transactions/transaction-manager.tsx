"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDate, formatRupiah, parseRupiahInput } from "@/lib/money";
import {
  createIdempotencyKey,
  enqueueTransaction,
} from "@/lib/offline-queue";
import type { AccountView } from "@/services/account.service";
import type { CategoryView } from "@/services/category.service";
import type { TransactionView } from "@/services/transaction.service";

type FormType = "INCOME" | "EXPENSE" | "TRANSFER";
type FilterType = "ALL" | FormType;

const TYPE_LABELS: Record<string, string> = {
  INCOME: "Pemasukan",
  EXPENSE: "Pengeluaran",
  TRANSFER: "Transfer",
  OPENING_BALANCE: "Saldo awal",
  ADJUSTMENT: "Penyesuaian",
  REFUND: "Refund",
};

export function TransactionManager({
  accounts,
  categories,
  transactions,
  today,
}: {
  accounts: AccountView[];
  categories: CategoryView[];
  transactions: TransactionView[];
  today: string;
}) {
  const router = useRouter();
  const [type, setType] = useState<FormType>("EXPENSE");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("ALL");

  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const formCategories = categories.filter(
    (category) => category.type === type && !category.isArchived,
  );

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError(null);
    setInfo(null);
    setPending(true);

    const payload: Record<string, unknown> = {
      type,
      amount: parseRupiahInput(String(form.get("amount") ?? "")),
      transactionDate: String(form.get("transactionDate") || today),
      description: String(form.get("description") ?? ""),
      idempotencyKey: createIdempotencyKey(),
    };

    if (type === "TRANSFER") {
      payload.sourceAccountId = form.get("sourceAccountId");
      payload.destinationAccountId = form.get("destinationAccountId");
    } else {
      payload.accountId = form.get("accountId");
      payload.categoryId = form.get("categoryId");
    }

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setError(data?.error ?? "Gagal menyimpan transaksi.");
        return;
      }

      formElement.reset();
      router.refresh();
    } catch {
      enqueueTransaction(payload);
      formElement.reset();
      setInfo(
        "Kamu sedang offline. Transaksi disimpan di perangkat dan akan dikirim otomatis saat koneksi tersedia.",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleVoid(transaction: TransactionView) {
    if (!window.confirm("Batalkan transaksi ini? Saldo akan dikembalikan.")) {
      return;
    }

    setError(null);
    setPending(true);

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Gagal membatalkan transaksi.");
        return;
      }

      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setPending(false);
    }
  }

  const filtered = transactions.filter((transaction) => {
    if (filterType !== "ALL" && transaction.type !== filterType) return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return [
      transaction.description,
      transaction.category?.name,
      transaction.account?.name,
      transaction.sourceAccount?.name,
      transaction.destinationAccount?.name,
    ]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(query));
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
      <form
        onSubmit={handleCreate}
        className="space-y-4 self-start card p-6"
      >
        <h2 className="text-sm font-semibold text-text">Catat transaksi</h2>

        {error ? (
          <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {info ? (
          <p className="rounded-xl bg-success-soft px-3 py-2 text-sm text-success-text">
            {info}
          </p>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="tx-type" className="block text-sm font-medium text-text">
            Tipe
          </label>
          <Select
            id="tx-type"
            value={type}
            onChange={(event) => setType(event.target.value as FormType)}
          >
            <option value="EXPENSE">Pengeluaran</option>
            <option value="INCOME">Pemasukan</option>
            <option value="TRANSFER">Transfer</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="tx-amount" className="block text-sm font-medium text-text">
            Nominal
          </label>
          <Input
            id="tx-amount"
            name="amount"
            inputMode="numeric"
            required
            placeholder="0"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="tx-date" className="block text-sm font-medium text-text">
            Tanggal
          </label>
          <Input
            id="tx-date"
            name="transactionDate"
            type="date"
            required
            defaultValue={today}
          />
        </div>

        {type === "TRANSFER" ? (
          <>
            <div className="space-y-1.5">
              <label htmlFor="tx-source" className="block text-sm font-medium text-text">
                Dari rekening
              </label>
              <Select id="tx-source" name="sourceAccountId" required>
                <option value="">Pilih rekening</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="tx-destination" className="block text-sm font-medium text-text">
                Ke rekening
              </label>
              <Select id="tx-destination" name="destinationAccountId" required>
                <option value="">Pilih rekening</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <label htmlFor="tx-category" className="block text-sm font-medium text-text">
                Kategori
              </label>
              <Select key={type} id="tx-category" name="categoryId" required>
                <option value="">Pilih kategori</option>
                {formCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="tx-account" className="block text-sm font-medium text-text">
                Rekening
              </label>
              <Select id="tx-account" name="accountId" required>
                <option value="">Pilih rekening</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <label htmlFor="tx-description" className="block text-sm font-medium text-text">
            Keterangan (opsional)
          </label>
          <Input
            id="tx-description"
            name="description"
            maxLength={255}
            placeholder="Makan siang"
          />
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan transaksi"}
        </Button>
      </form>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari transaksi..."
            aria-label="Cari transaksi"
          />
          <Select
            value={filterType}
            onChange={(event) => setFilterType(event.target.value as FilterType)}
            aria-label="Filter tipe"
            className="sm:w-48"
          >
            <option value="ALL">Semua tipe</option>
            <option value="INCOME">Pemasukan</option>
            <option value="EXPENSE">Pengeluaran</option>
            <option value="TRANSFER">Transfer</option>
          </Select>
        </div>

        <div className="card">
          <h2 className="border-b border-border px-6 py-4 text-sm font-semibold text-text">
            Riwayat transaksi
          </h2>
          {filtered.length === 0 ? (
            <p className="px-6 py-8 text-sm text-text-secondary">
              Tidak ada transaksi yang cocok.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((transaction) => {
                const title =
                  transaction.description ||
                  transaction.category?.name ||
                  TYPE_LABELS[transaction.type] ||
                  "Transaksi";

                const meta =
                  transaction.type === "TRANSFER"
                    ? `${transaction.sourceAccount?.name ?? "-"} → ${
                        transaction.destinationAccount?.name ?? "-"
                      }`
                    : `${transaction.category?.name ?? "-"} • ${
                        transaction.account?.name ?? "-"
                      }`;

                const canVoid =
                  transaction.status === "POSTED" &&
                  transaction.type !== "OPENING_BALANCE";

                return (
                  <li
                    key={transaction.id}
                    className={`flex items-center justify-between gap-4 px-6 py-3 ${
                      transaction.status === "VOIDED" ? "opacity-60" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`truncate text-sm font-medium text-text ${
                            transaction.status === "VOIDED" ? "line-through" : ""
                          }`}
                        >
                          {title}
                        </p>
                        {transaction.status === "VOIDED" ? (
                          <Badge tone="warning">Void</Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {formatDate(transaction.transactionDate)} • {meta}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`whitespace-nowrap text-sm font-semibold ${
                          transaction.type === "INCOME"
                            ? "text-success-text"
                            : transaction.type === "EXPENSE"
                              ? "text-danger"
                              : "text-text"
                        }`}
                      >
                        {transaction.type === "INCOME"
                          ? "+"
                          : transaction.type === "EXPENSE"
                            ? "-"
                            : ""}
                        {formatRupiah(transaction.amount)}
                      </span>
                      {canVoid ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 px-3 text-xs"
                          disabled={pending}
                          onClick={() => handleVoid(transaction)}
                        >
                          Void
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
