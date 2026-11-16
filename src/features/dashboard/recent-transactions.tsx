import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatRupiah } from "@/lib/money";
import type { TransactionView } from "@/services/transaction.service";

export function RecentTransactions({
  transactions,
}: {
  transactions: TransactionView[];
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold text-text">Transaksi terbaru</h2>
        <Link
          href="/transactions"
          className="text-sm font-medium text-primary hover:text-primary-hover"
        >
          Lihat semua
        </Link>
      </div>

      {transactions.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-text-secondary">
          Belum ada transaksi. Mulai catat pemasukan atau pengeluaran.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {transactions.map((transaction) => {
            const title =
              transaction.description ||
              transaction.category?.name ||
              (transaction.type === "TRANSFER" ? "Transfer" : "Transaksi");

            return (
              <li
                key={transaction.id}
                className={`flex items-center justify-between gap-4 px-5 py-3 ${
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
                    {formatDate(transaction.transactionDate)}
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
            );
          })}
        </ul>
      )}
    </div>
  );
}
