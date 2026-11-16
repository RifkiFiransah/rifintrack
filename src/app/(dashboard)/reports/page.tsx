import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CashFlowChart } from "@/components/charts/cash-flow-chart";
import { ExpenseBreakdown } from "@/components/charts/expense-breakdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { getSession } from "@/lib/auth";
import { formatDate, formatPercent, formatRupiah } from "@/lib/money";
import {
  REPORT_PERIOD_LABELS,
  REPORT_PERIODS,
  getReportData,
  resolveReportInput,
} from "@/services/report.service";

export const metadata: Metadata = {
  title: "Laporan",
};

const TYPE_LABELS: Record<string, string> = {
  INCOME: "Pemasukan",
  EXPENSE: "Pengeluaran",
  TRANSFER: "Transfer",
  OPENING_BALANCE: "Saldo awal",
  ADJUSTMENT: "Penyesuaian",
  REVERSAL: "Reversal",
};

function formatDelta(value: number | null) {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatPercent(value)}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; date?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const { period, anchor } = resolveReportInput(params.period, params.date);
  const report = await getReportData(session.user.id, period, anchor);

  const exportHref = `/api/reports/export?period=${report.period}&date=${report.anchor}`;
  const netTone =
    report.summary.net > 0
      ? "income"
      : report.summary.net < 0
        ? "expense"
        : "neutral";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Laporan</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Ringkasan {report.label}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`${exportHref}&format=csv`}
            className="inline-flex h-10 items-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-text shadow-sm transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-muted"
          >
            Export CSV
          </a>
          <a
            href={`${exportHref}&format=xlsx`}
            className="inline-flex h-10 items-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-text shadow-sm transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-muted"
          >
            Export Excel
          </a>
          <a
            href={`${exportHref}&format=pdf`}
            className="bg-brand inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-white shadow-brand transition hover:-translate-y-0.5 hover:bg-brand-hover"
          >
            Export PDF
          </a>
        </div>
      </div>

      <form
        action="/reports"
        method="get"
        className="flex flex-wrap items-end gap-3 card p-5"
      >
        <div className="space-y-1.5">
          <label htmlFor="report-period" className="block text-sm font-medium text-text">
            Periode
          </label>
          <Select
            id="report-period"
            name="period"
            defaultValue={report.period}
            className="w-44"
          >
            {REPORT_PERIODS.map((value) => (
              <option key={value} value={value}>
                {REPORT_PERIOD_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="report-date" className="block text-sm font-medium text-text">
            Tanggal acuan
          </label>
          <Input
            id="report-date"
            name="date"
            type="date"
            defaultValue={report.anchor}
            className="w-44"
          />
        </div>

        <Button type="submit" variant="secondary">
          Terapkan
        </Button>
      </form>

      <section
        aria-label="Ringkasan laporan"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Pemasukan"
          value={formatRupiah(report.summary.income)}
          tone="income"
        />
        <StatCard
          label="Pengeluaran"
          value={formatRupiah(report.summary.expense)}
          tone="expense"
        />
        <StatCard
          label="Selisih"
          value={formatRupiah(report.summary.net)}
          tone={netTone}
        />
        <StatCard
          label="Jumlah transaksi"
          value={String(report.summary.transactionCount)}
          hint="Pemasukan dan pengeluaran"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="card p-5">
          <div className="mb-2">
            <h2 className="text-base font-semibold text-text">
              Arus kas {REPORT_PERIOD_LABELS[report.period]}
            </h2>
            <p className="text-xs text-text-secondary">{report.label}</p>
          </div>
          <CashFlowChart
            data={report.trend}
            ariaLabel={`Grafik arus kas ${REPORT_PERIOD_LABELS[report.period]}`}
          />
        </section>

        <section className="card p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-text">
              Pengeluaran per kategori
            </h2>
            <p className="text-xs text-text-secondary">{report.label}</p>
          </div>
          <ExpenseBreakdown
            items={report.expenseByCategory}
            emptyMessage="Belum ada pengeluaran pada periode ini."
          />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <section className="card p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-text">Perbandingan</h2>
            <p className="text-xs text-text-secondary">
              Dibanding {report.comparison.label}
            </p>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-secondary">Pemasukan</dt>
              <dd className="flex items-center gap-2">
                <span className="text-text">
                  {formatRupiah(report.comparison.income)}
                </span>
                <span
                  className={
                    (report.comparison.incomeDelta ?? 0) >= 0
                      ? "text-success-text"
                      : "text-danger"
                  }
                >
                  {formatDelta(report.comparison.incomeDelta)}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-secondary">Pengeluaran</dt>
              <dd className="flex items-center gap-2">
                <span className="text-text">
                  {formatRupiah(report.comparison.expense)}
                </span>
                <span
                  className={
                    (report.comparison.expenseDelta ?? 0) <= 0
                      ? "text-success-text"
                      : "text-danger"
                  }
                >
                  {formatDelta(report.comparison.expenseDelta)}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h2 className="border-b border-border px-5 py-4 text-base font-semibold text-text">
            Transaksi pada periode
          </h2>

          {report.transactions.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-text-secondary">
              Tidak ada transaksi pada periode ini.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {report.transactions.map((transaction) => (
                <li
                  key={transaction.id}
                  className={`flex items-center justify-between gap-4 px-5 py-3 ${
                    transaction.status === "VOIDED" ? "opacity-60" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-text">
                        {transaction.description ||
                          transaction.category?.name ||
                          TYPE_LABELS[transaction.type] ||
                          "Transaksi"}
                      </p>
                      {transaction.status === "VOIDED" ? (
                        <Badge tone="warning">Void</Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {formatDate(transaction.transactionDate)} •{" "}
                      {TYPE_LABELS[transaction.type] ?? transaction.type}
                      {transaction.type === "TRANSFER"
                        ? ` • ${transaction.sourceAccount?.name ?? "-"} → ${
                            transaction.destinationAccount?.name ?? "-"
                          }`
                        : ` • ${transaction.account?.name ?? "-"}`}
                    </p>
                  </div>
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
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
