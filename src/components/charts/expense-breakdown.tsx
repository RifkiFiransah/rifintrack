import { formatPercent, formatRupiah } from "@/lib/money";
import type { ExpenseCategorySlice } from "@/services/dashboard.service";

export function ExpenseBreakdown({
  items,
  emptyMessage = "Belum ada pengeluaran bulan ini.",
}: {
  items: ExpenseCategorySlice[];
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-text-secondary">
        {emptyMessage}
      </p>
    );
  }

  const maxAmount = items[0]?.amount || 1;

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id ?? item.name}>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="truncate text-text">{item.name}</span>
            <span className="whitespace-nowrap font-medium text-text">
              {formatRupiah(item.amount)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-sm bg-surface-muted">
              <div
                className="h-full rounded-sm bg-primary"
                style={{
                  width: `${Math.min(100, (item.amount / maxAmount) * 100)}%`,
                }}
              />
            </div>
            <span className="w-12 text-right text-xs text-text-secondary">
              {formatPercent(item.share)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
