import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RecurringManager } from "@/features/recurring/recurring-manager";
import { getSession } from "@/lib/auth";
import { listAccounts } from "@/services/account.service";
import { listCategories } from "@/services/category.service";
import { listRecurringRules } from "@/services/recurring.service";

export const metadata: Metadata = {
  title: "Transaksi Rutin",
};

export default async function RecurringPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [rules, accounts, categories] = await Promise.all([
    listRecurringRules(session.user.id),
    listAccounts(session.user.id),
    listCategories(session.user.id),
  ]);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(now.getDate()).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Transaksi Rutin</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Atur transaksi berulang dan konfirmasi jadwal yang jatuh tempo.
        </p>
      </div>

      <RecurringManager
        rules={rules}
        accounts={accounts}
        categories={categories}
        today={today}
      />
    </div>
  );
}
