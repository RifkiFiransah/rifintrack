import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BudgetManager } from "@/features/budgets/budget-manager";
import { getSession } from "@/lib/auth";
import { getBudget } from "@/services/budget.service";
import { listCategories } from "@/services/category.service";

export const metadata: Metadata = {
  title: "Anggaran",
};

function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const now = new Date();

  const parsedYear = Number(params.year);
  const parsedMonth = Number(params.month);
  const year =
    Number.isInteger(parsedYear) && parsedYear >= 2020 && parsedYear <= 2100
      ? parsedYear
      : now.getFullYear();
  const month =
    Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
      ? parsedMonth
      : now.getMonth() + 1;

  const [budget, categories] = await Promise.all([
    getBudget(session.user.id, year, month),
    listCategories(session.user.id),
  ]);

  const expenseCategories = categories.filter(
    (category) => category.type === "EXPENSE" && !category.isArchived,
  );

  const monthLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  const previous = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Anggaran</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Bandingkan limit kategori dengan realisasi pengeluaran.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/budgets?year=${previous.year}&month=${previous.month}`}
            aria-label="Bulan sebelumnya"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition hover:bg-surface-muted"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <span className="min-w-40 text-center text-sm font-medium text-text">
            {monthLabel}
          </span>
          <Link
            href={`/budgets?year=${next.year}&month=${next.month}`}
            aria-label="Bulan berikutnya"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition hover:bg-surface-muted"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <BudgetManager
        budget={budget}
        categories={expenseCategories}
        year={year}
        month={month}
        monthLabel={monthLabel}
      />
    </div>
  );
}
