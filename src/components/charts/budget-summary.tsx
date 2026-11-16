import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatPercent, formatRupiah } from "@/lib/money";
import type { BudgetSummaryView } from "@/services/dashboard.service";

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

export function BudgetSummary({ budget }: { budget: BudgetSummaryView | null }) {
  if (!budget) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-text-secondary">
          Anggaran bulan ini belum dibuat. Buat anggaran agar pengeluaran lebih
          terkendali.
        </p>
        <Link
          href="/budgets"
          className="mt-3 inline-block text-sm font-medium text-primary hover:text-primary-hover"
        >
          Buat anggaran
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-text">{budget.name}</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              {formatRupiah(budget.totalSpent)} dari{" "}
              {formatRupiah(budget.totalLimit)}
            </p>
          </div>
          {statusBadge(budget.share)}
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-sm bg-surface-muted">
          <div
            className={`h-full rounded-sm ${barTone(budget.share)}`}
            style={{ width: `${Math.min(100, budget.share * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-text-secondary">
          {formatPercent(budget.share)} terpakai
        </p>
      </div>

      <ul className="space-y-3 border-t border-border pt-4">
        {budget.items.map((item) => (
          <li key={item.id}>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="truncate text-text">{item.name}</span>
              <span className="whitespace-nowrap text-xs text-text-secondary">
                {formatRupiah(item.spent)} / {formatRupiah(item.limit)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-sm bg-surface-muted">
              <div
                className={`h-full rounded-sm ${barTone(item.share)}`}
                style={{ width: `${Math.min(100, item.share * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
