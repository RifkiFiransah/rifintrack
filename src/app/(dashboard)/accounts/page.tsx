import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountManager } from "@/features/accounts/account-manager";
import { getSession } from "@/lib/auth";
import { listAccounts } from "@/services/account.service";

export const metadata: Metadata = {
  title: "Rekening",
};

export default async function AccountsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const accounts = await listAccounts(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Rekening</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Kelola rekening bank, dompet digital, dan tunai.
        </p>
      </div>

      <AccountManager accounts={accounts} />
    </div>
  );
}
