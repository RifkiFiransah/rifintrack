import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SavingsManager } from "@/features/savings/savings-manager";
import { getSession } from "@/lib/auth";
import { listSavings } from "@/services/savings.service";

export const metadata: Metadata = {
  title: "Tabungan",
};

export default async function SavingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { goals, summary } = await listSavings(session.user.id);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Tabungan</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Kelola tujuan tabungan, dana darurat, dan kontribusinya.
        </p>
      </div>

      <SavingsManager goals={goals} summary={summary} today={today} />
    </div>
  );
}
