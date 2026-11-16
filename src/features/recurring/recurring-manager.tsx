"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatRupiah, parseRupiahInput } from "@/lib/money";
import type { AccountView } from "@/services/account.service";
import type { CategoryView } from "@/services/category.service";
import type { RecurringRuleView } from "@/services/recurring.service";

const TYPE_LABELS: Record<string, string> = {
  INCOME: "Pemasukan",
  EXPENSE: "Pengeluaran",
  TRANSFER: "Transfer",
};

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Harian",
  WEEKLY: "Mingguan",
  MONTHLY: "Bulanan",
  YEARLY: "Tahunan",
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Terjadwal",
  POSTED: "Sudah dicatat",
  SKIPPED: "Dilewati",
};

const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value: string) {
  return DATE_FORMAT.format(new Date(`${value}T00:00:00Z`));
}

function frequencyText(rule: RecurringRuleView) {
  const label = FREQUENCY_LABELS[rule.frequency] ?? rule.frequency;
  const unit =
    rule.frequency === "DAILY"
      ? "hari"
      : rule.frequency === "WEEKLY"
        ? "minggu"
        : rule.frequency === "MONTHLY"
          ? "bulan"
          : "tahun";

  return rule.interval > 1 ? `${label} tiap ${rule.interval} ${unit}` : label;
}

export function RecurringManager({
  rules,
  accounts,
  categories,
  today,
}: {
  rules: RecurringRuleView[];
  accounts: AccountView[];
  categories: CategoryView[];
  today: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [busyOccurrence, setBusyOccurrence] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE" | "TRANSFER">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("MONTHLY");
  const [interval, setInterval] = useState("1");
  const [dayOfMonth, setDayOfMonth] = useState(String(new Date().getDate()));
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id ?? "");
  const [destinationAccountId, setDestinationAccountId] = useState(
    accounts[1]?.id ?? "",
  );

  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const formCategories = categories.filter(
    (category) =>
      !category.isArchived &&
      (type === "TRANSFER" ? false : category.type === type),
  );

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nominal = parseRupiahInput(amount);
    if (nominal <= 0) {
      setError("Nominal harus lebih dari 0.");
      return;
    }
    if (type === "TRANSFER") {
      if (!sourceAccountId || !destinationAccountId) {
        setError("Rekening sumber dan tujuan wajib diisi.");
        return;
      }
      if (sourceAccountId === destinationAccountId) {
        setError("Rekening sumber dan tujuan tidak boleh sama.");
        return;
      }
    } else if (!accountId || !categoryId) {
      setError("Rekening dan kategori wajib diisi.");
      return;
    }

    const ok = await request("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        amount: nominal,
        frequency,
        interval: Number(interval) || 1,
        dayOfMonth: frequency === "MONTHLY" ? Number(dayOfMonth) : undefined,
        startDate,
        endDate: endDate || undefined,
        accountId: type === "TRANSFER" ? undefined : accountId,
        categoryId: type === "TRANSFER" ? undefined : categoryId,
        sourceAccountId: type === "TRANSFER" ? sourceAccountId : undefined,
        destinationAccountId:
          type === "TRANSFER" ? destinationAccountId : undefined,
      }),
    });

    if (ok) {
      setName("");
      setAmount("");
    }
  }

  async function toggleRule(rule: RecurringRuleView) {
    await request(`/api/recurring/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !rule.isActive }),
    });
  }

  async function handleOccurrence(
    occurrenceId: string,
    action: "post" | "skip",
  ) {
    setBusyOccurrence(occurrenceId);
    await request(`/api/recurring/occurrences/${occurrenceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyOccurrence(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 self-start card p-6"
      >
        <h2 className="text-sm font-semibold text-text">Transaksi rutin baru</h2>

        {error ? (
          <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="recurring-name" className="block text-sm font-medium text-text">
            Nama
          </label>
          <Input
            id="recurring-name"
            required
            maxLength={100}
            placeholder="Contoh: Bayar kos"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="recurring-type" className="block text-sm font-medium text-text">
            Tipe
          </label>
          <Select
            id="recurring-type"
            value={type}
            onChange={(event) => {
              setType(event.target.value as "INCOME" | "EXPENSE" | "TRANSFER");
              setCategoryId("");
            }}
          >
            <option value="EXPENSE">Pengeluaran</option>
            <option value="INCOME">Pemasukan</option>
            <option value="TRANSFER">Transfer</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="recurring-amount" className="block text-sm font-medium text-text">
            Nominal
          </label>
          <Input
            id="recurring-amount"
            inputMode="numeric"
            required
            placeholder="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="recurring-frequency" className="block text-sm font-medium text-text">
              Frekuensi
            </label>
            <Select
              id="recurring-frequency"
              value={frequency}
              onChange={(event) => setFrequency(event.target.value)}
            >
              <option value="DAILY">Harian</option>
              <option value="WEEKLY">Mingguan</option>
              <option value="MONTHLY">Bulanan</option>
              <option value="YEARLY">Tahunan</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="recurring-interval" className="block text-sm font-medium text-text">
              Setiap
            </label>
            <Input
              id="recurring-interval"
              type="number"
              min={1}
              max={365}
              value={interval}
              onChange={(event) => setInterval(event.target.value)}
            />
          </div>
        </div>

        {frequency === "MONTHLY" ? (
          <div className="space-y-1.5">
            <label htmlFor="recurring-day" className="block text-sm font-medium text-text">
              Tanggal jatuh tempo
            </label>
            <Input
              id="recurring-day"
              type="number"
              min={1}
              max={31}
              value={dayOfMonth}
              onChange={(event) => setDayOfMonth(event.target.value)}
            />
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="recurring-start" className="block text-sm font-medium text-text">
              Mulai
            </label>
            <Input
              id="recurring-start"
              type="date"
              required
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="recurring-end" className="block text-sm font-medium text-text">
              Selesai (opsional)
            </label>
            <Input
              id="recurring-end"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>

        {type === "TRANSFER" ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="recurring-source" className="block text-sm font-medium text-text">
                Dari rekening
              </label>
              <Select
                id="recurring-source"
                value={sourceAccountId}
                onChange={(event) => setSourceAccountId(event.target.value)}
              >
                <option value="">Pilih rekening</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="recurring-destination" className="block text-sm font-medium text-text">
                Ke rekening
              </label>
              <Select
                id="recurring-destination"
                value={destinationAccountId}
                onChange={(event) => setDestinationAccountId(event.target.value)}
              >
                <option value="">Pilih rekening</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="recurring-account" className="block text-sm font-medium text-text">
                Rekening
              </label>
              <Select
                id="recurring-account"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
              >
                <option value="">Pilih rekening</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="recurring-category" className="block text-sm font-medium text-text">
                Kategori
              </label>
              <Select
                id="recurring-category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">Pilih kategori</option>
                {formCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Menyimpan..." : "Simpan transaksi rutin"}
        </Button>
      </form>

      <section className="space-y-4">
        {rules.length === 0 ? (
          <div className="card p-6">
            <p className="text-sm text-text-secondary">
              Belum ada transaksi rutin. Buat aturan untuk mencatat transaksi
              berulang seperti sewa, langganan, atau gaji.
            </p>
          </div>
        ) : (
          rules.map((rule) => (
            <article
              key={rule.id}
              className="card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-text">{rule.name}</h3>
                    <Badge tone={rule.isActive ? "success" : "neutral"}>
                      {rule.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    {TYPE_LABELS[rule.type] ?? rule.type} • {formatRupiah(rule.amount)} •{" "}
                    {frequencyText(rule)}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {rule.type === "TRANSFER"
                      ? `${rule.sourceAccount?.name ?? "-"} → ${
                          rule.destinationAccount?.name ?? "-"
                        }`
                      : `${rule.account?.name ?? "-"} • ${
                          rule.category?.name ?? "-"
                        }`}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {rule.nextRunAt
                      ? `Jadwal berikutnya ${formatDate(rule.nextRunAt)}`
                      : "Tidak ada jadwal berikutnya"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  disabled={pending}
                  onClick={() => toggleRule(rule)}
                >
                  {rule.isActive ? "Nonaktifkan" : "Aktifkan"}
                </Button>
              </div>

              {rule.occurrences.length === 0 ? (
                <p className="px-5 py-4 text-sm text-text-secondary">
                  Belum ada jadwal dalam rentang tampilan.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {rule.occurrences.slice(0, 6).map((occurrence) => {
                    const due =
                      occurrence.status === "SCHEDULED" &&
                      occurrence.scheduledDate <= today;

                    return (
                      <li
                        key={occurrence.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-text">
                            {formatDate(occurrence.scheduledDate)}
                          </span>
                          <Badge
                            tone={
                              occurrence.status === "POSTED"
                                ? "success"
                                : occurrence.status === "SKIPPED"
                                  ? "neutral"
                                  : due
                                    ? "warning"
                                    : "neutral"
                            }
                          >
                            {due
                              ? "Jatuh tempo"
                              : STATUS_LABELS[occurrence.status] ??
                                occurrence.status}
                          </Badge>
                        </div>

                        {occurrence.status === "SCHEDULED" ? (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              className="h-8 px-3 text-xs"
                              disabled={
                                pending ||
                                busyOccurrence === occurrence.id ||
                                !due ||
                                !rule.isActive
                              }
                              onClick={() =>
                                handleOccurrence(occurrence.id, "post")
                              }
                            >
                              Posting
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-8 px-3 text-xs"
                              disabled={pending || busyOccurrence === occurrence.id}
                              onClick={() =>
                                handleOccurrence(occurrence.id, "skip")
                              }
                            >
                              Lewati
                            </Button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
