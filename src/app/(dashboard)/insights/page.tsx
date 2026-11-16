import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Lightbulb, PiggyBank, Target, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { getSession } from "@/lib/auth";
import { formatPercent, formatRupiah } from "@/lib/money";
import { getFinancialInsight } from "@/services/insight.service";

export const metadata: Metadata = {
  title: "Insight",
};

const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value: string) {
  return DATE_FORMAT.format(new Date(`${value}T00:00:00Z`));
}

export default async function InsightsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const insight = await getFinancialInsight(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Insight</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Analisis dan rekomendasi keuangan {insight.periodLabel}.
          </p>
        </div>
        <Link
          href="/reports"
          className="text-sm font-medium text-primary hover:text-primary-hover"
        >
          Lihat laporan
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pemasukan" value={formatRupiah(insight.income)} tone="income" />
        <StatCard
          label="Pengeluaran"
          value={formatRupiah(insight.expense)}
          tone="expense"
        />
        <StatCard
          label="Arus kas bersih"
          value={formatRupiah(insight.net)}
          tone={insight.net < 0 ? "expense" : "income"}
        />
        <StatCard
          label="Rasio tabungan"
          value={
            insight.savingsRate === null
              ? "—"
              : formatPercent(insight.savingsRate)
          }
          hint="Kontribusi tabungan / pemasukan"
          icon={<PiggyBank className="h-5 w-5" aria-hidden="true" />}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-6">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-text-muted" aria-hidden="true" />
            <h2 className="text-base font-semibold text-text">
              Pengeluaran terbesar
            </h2>
          </div>

          {insight.topCategory ? (
            <div className="mt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-lg font-bold text-text">
                  {insight.topCategory.name}
                </p>
                <Badge
                  tone={insight.topCategory.share >= 0.4 ? "warning" : "neutral"}
                >
                  {formatPercent(insight.topCategory.share)}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                {formatRupiah(insight.topCategory.amount)} dari total
                pengeluaran bulan ini.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-text-secondary">
              Belum ada pengeluaran tercatat bulan ini.
            </p>
          )}

          {insight.budget ? (
            <div className="mt-6 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-text">
                  {insight.budget.name}
                </p>
                <Badge
                  tone={
                    insight.budget.share > 1
                      ? "danger"
                      : insight.budget.share >= 0.8
                        ? "warning"
                        : "success"
                  }
                >
                  {formatPercent(insight.budget.share)}
                </Badge>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-sm bg-surface-muted">
                <div
                  className={`h-full rounded-sm ${
                    insight.budget.share > 1
                      ? "bg-danger"
                      : insight.budget.share >= 0.8
                        ? "bg-warning"
                        : "bg-success"
                  }`}
                  style={{
                    width: `${Math.min(100, insight.budget.share * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                {insight.budget.overCount} kategori melewati limit •{" "}
                {insight.budget.warningCount} mendekati limit
              </p>
            </div>
          ) : null}
        </section>

        <section className="card p-6">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-text-muted" aria-hidden="true" />
            <h2 className="text-base font-semibold text-text">Dana darurat</h2>
          </div>

          {insight.emergencyFund ? (
            <div className="mt-4">
              <p className="text-lg font-bold text-text">
                {formatRupiah(insight.emergencyFund.total)}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                dari target {formatRupiah(insight.emergencyFund.target)}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-sm bg-surface-muted">
                <div
                  className="h-full rounded-sm bg-success"
                  style={{
                    width: `${Math.min(
                      100,
                      (insight.emergencyFund.progress ?? 0) * 100,
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                {formatPercent(insight.emergencyFund.progress ?? 0)} tercapai
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-text-secondary">
              Belum ada tujuan dana darurat.{" "}
              <Link href="/savings" className="text-primary hover:text-primary-hover">
                Buat tujuan
              </Link>
            </p>
          )}

          {insight.goals.length > 0 ? (
            <ul className="mt-6 space-y-3 border-t border-border pt-4">
              {insight.goals.map((goal) => (
                <li key={goal.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">
                      {goal.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {goal.monthsToTarget === null
                        ? "Belum ada estimasi"
                        : goal.monthsToTarget === 0
                          ? "Target tercapai"
                          : `Estimasi ${formatDate(goal.estimatedDate!)}`}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm text-text-secondary">
                    {formatPercent(goal.progress)}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <section className="card p-6">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-text-muted" aria-hidden="true" />
          <h2 className="text-base font-semibold text-text">Rekomendasi</h2>
        </div>
        <ul className="mt-4 space-y-3">
          {insight.recommendations.map((recommendation) => (
            <li
              key={recommendation}
              className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-text-secondary"
            >
              {recommendation}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
