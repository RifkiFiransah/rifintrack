"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatRupiah, parseRupiahInput } from "@/lib/money";
import type { AccountView } from "@/services/account.service";

const TYPE_LABELS: Record<AccountView["type"], string> = {
  BANK: "Bank",
  E_WALLET: "E-Wallet",
  CASH: "Tunai",
  OTHER: "Lainnya",
};

export function AccountManager({ accounts }: { accounts: AccountView[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          type: form.get("type"),
          institution: form.get("institution"),
          openingBalance: parseRupiahInput(
            String(form.get("openingBalance") ?? ""),
          ),
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setError(data?.error ?? "Gagal menambah rekening.");
        return;
      }

      formElement.reset();
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setPending(false);
    }
  }

  async function toggleArchive(account: AccountView) {
    setError(null);
    setPending(true);

    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !account.isArchived }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Gagal memperbarui rekening.");
        return;
      }

      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <form
        onSubmit={handleCreate}
        className="space-y-4 card p-6"
      >
        <h2 className="text-sm font-semibold text-text">Tambah rekening</h2>

        {error ? (
          <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="account-name" className="block text-sm font-medium text-text">
            Nama
          </label>
          <Input id="account-name" name="name" required maxLength={100} placeholder="BCA" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="account-type" className="block text-sm font-medium text-text">
            Tipe
          </label>
          <Select id="account-type" name="type" defaultValue="BANK">
            <option value="BANK">Bank</option>
            <option value="E_WALLET">E-Wallet</option>
            <option value="CASH">Tunai</option>
            <option value="OTHER">Lainnya</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="account-institution" className="block text-sm font-medium text-text">
            Institusi (opsional)
          </label>
          <Input id="account-institution" name="institution" maxLength={100} placeholder="Bank Central Asia" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="account-opening" className="block text-sm font-medium text-text">
            Saldo awal
          </label>
          <Input
            id="account-opening"
            name="openingBalance"
            inputMode="numeric"
            placeholder="0"
            defaultValue="0"
          />
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Menyimpan..." : "Tambah rekening"}
        </Button>
      </form>

      <div className="card">
        <h2 className="border-b border-border px-6 py-4 text-sm font-semibold text-text">
          Daftar rekening
        </h2>
        {accounts.length === 0 ? (
          <p className="px-6 py-8 text-sm text-text-secondary">
            Belum ada rekening. Tambahkan rekening pertamamu.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {accounts.map((account) => (
              <li
                key={account.id}
                className={`flex items-center justify-between gap-4 px-6 py-4 ${
                  account.isArchived ? "opacity-60" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-text">
                      {account.name}
                    </p>
                    <Badge>{TYPE_LABELS[account.type]}</Badge>
                    {account.isArchived ? <Badge tone="warning">Arsip</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">
                    {formatRupiah(account.balance)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => toggleArchive(account)}
                >
                  {account.isArchived ? "Aktifkan" : "Arsipkan"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
