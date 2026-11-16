import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PiggyBank, Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { BudgetSummary } from "@/components/charts/budget-summary";
import { CashFlowChart } from "@/components/charts/cash-flow-chart";
import { ExpenseBreakdown } from "@/components/charts/expense-breakdown";
import { StatCard } from "@/components/ui/stat-card";
import { RecentTransactions } from "@/features/dashboard/recent-transactions";
import { getSession } from "@/lib/auth";
import { formatRupiah } from "@/lib/money";
import { getDashboardData } from "@/services/dashboard.service";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getDashboardData(session.user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Ringkasan
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text">Dashboard</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Ringkasan keuangan {data.monthLabel}.
          </p>
        </div>
        <Link
          href="/transactions"
          className="bg-brand inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-brand transition hover:-translate-y-0.5 hover:bg-brand-hover active:translate-y-0"
        >
          <Plus className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
          Catat transaksi
        </Link>
      </div>

      <section
        aria-label="Ringkasan keuangan"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Total saldo"
          value={formatRupiah(data.totalBalance)}
          hint={`${data.activeAccounts} rekening aktif`}
          icon={<Wallet className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Pemasukan bulan ini"
          value={formatRupiah(data.monthlyIncome)}
          tone="income"
          icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Pengeluaran bulan ini"
          value={formatRupiah(data.monthlyExpense)}
          tone="expense"
          icon={<TrendingDown className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Total tabungan"
          value={formatRupiah(data.totalSavings)}
          hint="Akumulasi kontribusi"
          icon={<PiggyBank className="h-5 w-5" aria-hidden="true" />}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="card p-5">
          <div className="mb-2">
            <h2 className="text-base font-semibold text-text">Arus kas</h2>
            <p className="text-xs text-text-secondary">6 bulan terakhir</p>
          </div>
          <CashFlowChart data={data.cashFlow} />
        </section>

        <section className="card p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-text">
              Pengeluaran per kategori
            </h2>
            <p className="text-xs text-text-secondary">{data.monthLabel}</p>
          </div>
          <ExpenseBreakdown items={data.expenseByCategory} />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <section className="card p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-text">
              Ringkasan anggaran
            </h2>
            <p className="text-xs text-text-secondary">{data.monthLabel}</p>
          </div>
          <BudgetSummary budget={data.budget} />
        </section>

        <RecentTransactions transactions={data.recentTransactions} />
      </div>
    </div>
  );
}
