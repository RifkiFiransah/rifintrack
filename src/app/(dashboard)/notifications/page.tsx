import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NotificationManager } from "@/features/notifications/notification-manager";
import { getSession } from "@/lib/auth";
import { listNotifications } from "@/services/notification.service";

export const metadata: Metadata = {
  title: "Notifikasi",
};

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { notifications, unreadCount } = await listNotifications(
    session.user.id,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Notifikasi</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Pengingat transaksi rutin, anggaran, dan progres tabungan.
        </p>
      </div>

      <NotificationManager
        notifications={notifications}
        unreadCount={unreadCount}
      />
    </div>
  );
}
