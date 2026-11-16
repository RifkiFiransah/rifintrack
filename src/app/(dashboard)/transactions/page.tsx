import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TransactionManager } from "@/features/transactions/transaction-manager";
import { getSession } from "@/lib/auth";
import { listAccounts } from "@/services/account.service";
import { listCategories } from "@/services/category.service";
import { listTransactions } from "@/services/transaction.service";

export const metadata: Metadata = {
  title: "Transaksi",
};

export default async function TransactionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [accounts, categories, transactions] = await Promise.all([
    listAccounts(session.user.id),
    listCategories(session.user.id),
    listTransactions(session.user.id, { take: 100 }),
  ]);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Transaksi</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Catat pemasukan, pengeluaran, dan transfer antar rekening.
        </p>
      </div>

      <TransactionManager
        accounts={accounts}
        categories={categories}
        transactions={transactions}
        today={today}
      />
    </div>
  );
}
