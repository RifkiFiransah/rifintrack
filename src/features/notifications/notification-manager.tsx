"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NotificationView } from "@/services/notification.service";

const TYPE_LABELS: Record<string, string> = {
  BUDGET_WARNING: "Anggaran",
  BUDGET_EXCEEDED: "Anggaran",
  SAVINGS_PROGRESS: "Tabungan",
  RECURRING_REMINDER: "Transaksi rutin",
  SYSTEM: "Sistem",
};

const TYPE_TONES: Record<
  string,
  "neutral" | "success" | "danger" | "warning"
> = {
  BUDGET_WARNING: "warning",
  BUDGET_EXCEEDED: "danger",
  SAVINGS_PROGRESS: "success",
  RECURRING_REMINDER: "neutral",
  SYSTEM: "neutral",
};

const DATE_TIME = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(value: string) {
  return DATE_TIME.format(new Date(value));
}

export function NotificationManager({
  notifications,
  unreadCount,
}: {
  notifications: NotificationView[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function request(path: string, init: RequestInit) {
    setError(null);
    setPending(true);

    try {
      const response = await fetch(path, init);
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setError(data?.error ?? "Terjadi kesalahan.");
        return;
      }

      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setPending(false);
    }
  }

  async function markAllRead() {
    await request("/api/notifications/read-all", { method: "POST" });
  }

  async function markRead(notification: NotificationView) {
    if (notification.readAt) return;

    await request(`/api/notifications/${notification.id}`, {
      method: "PATCH",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          {unreadCount > 0
            ? `${unreadCount} notifikasi belum dibaca`
            : "Semua notifikasi sudah dibaca"}
        </p>
        <Button
          type="button"
          variant="secondary"
          disabled={pending || unreadCount === 0}
          onClick={markAllRead}
        >
          Tandai semua dibaca
        </Button>
      </div>

      {error ? (
        <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {notifications.length === 0 ? (
        <div className="card p-6">
          <p className="text-sm text-text-secondary">
            Belum ada notifikasi. Pengingat anggaran, tabungan, dan transaksi
            rutin akan muncul di sini.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden card">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`flex flex-wrap items-start justify-between gap-3 px-5 py-4 ${
                notification.readAt ? "" : "bg-primary-soft/40"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={TYPE_TONES[notification.type] ?? "neutral"}>
                    {TYPE_LABELS[notification.type] ?? notification.type}
                  </Badge>
                  {notification.readAt ? null : (
                    <span
                      className="h-2 w-2 rounded-full bg-primary"
                      aria-label="Belum dibaca"
                    />
                  )}
                </div>
                <p className="mt-1.5 text-sm font-medium text-text">
                  {notification.title}
                </p>
                <p className="mt-0.5 text-sm text-text-secondary">
                  {notification.message}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {formatDateTime(notification.createdAt)}
                </p>
              </div>

              {notification.readAt ? null : (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 px-3 text-xs"
                  disabled={pending}
                  onClick={() => markRead(notification)}
                >
                  Tandai dibaca
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
