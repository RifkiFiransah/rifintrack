import type { NotificationType } from "@prisma/client";
import { formatRupiah } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/service-error";
import { getBudget } from "@/services/budget.service";
import { ensureRecurringOccurrences } from "@/services/recurring.service";
import { listSavings } from "@/services/savings.service";

export type NotificationView = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

export type NotificationList = {
  notifications: NotificationView[];
  unreadCount: number;
};

function utcDay(date = new Date()) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function utcMonthStart(date = new Date()) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

function toView(record: {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt: Date | null;
  createdAt: Date;
}): NotificationView {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    message: record.message,
    readAt: record.readAt ? record.readAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
  };
}

async function ensureNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  since: Date,
) {
  const existing = await prisma.notification.findFirst({
    where: { userId, type, title, createdAt: { gte: since } },
    select: { id: true },
  });

  if (existing) return;

  await prisma.notification.create({
    data: { userId, type, title, message },
  });
}

export async function syncNotifications(userId: string) {
  const now = new Date();
  const monthStart = utcMonthStart(now);
  const day = utcDay(now);

  const budget = await getBudget(userId, now.getFullYear(), now.getMonth() + 1);
  if (budget) {
    for (const item of budget.items) {
      if (item.share < 0.8) continue;

      const exceeded = item.share > 1;
      await ensureNotification(
        userId,
        exceeded ? "BUDGET_EXCEEDED" : "BUDGET_WARNING",
        exceeded
          ? `Anggaran ${item.categoryName} terlampaui`
          : `Anggaran ${item.categoryName} hampir habis`,
        `Realisasi ${formatRupiah(item.spent)} dari limit ${formatRupiah(
          item.limit,
        )} (${Math.round(item.share * 100)}%).`,
        monthStart,
      );
    }
  }

  const { goals } = await listSavings(userId);
  for (const goal of goals) {
    if (goal.targetAmount <= 0) continue;

    if (goal.isCompleted) {
      await ensureNotification(
        userId,
        "SAVINGS_PROGRESS",
        `Tujuan tercapai: ${goal.name}`,
        `Kamu sudah menabung ${formatRupiah(
          goal.savedAmount,
        )} dari target ${formatRupiah(goal.targetAmount)}.`,
        monthStart,
      );
    } else if (goal.progress >= 0.8) {
      await ensureNotification(
        userId,
        "SAVINGS_PROGRESS",
        `Tujuan ${goal.name} hampir tercapai`,
        `Progres ${Math.round(goal.progress * 100)}% dari target ${formatRupiah(
          goal.targetAmount,
        )}.`,
        monthStart,
      );
    }
  }

  await ensureRecurringOccurrences(userId);

  const due = await prisma.recurringOccurrence.findMany({
    where: {
      status: "SCHEDULED",
      scheduledDate: { lte: day },
      recurringRule: { userId, isActive: true },
    },
    include: {
      recurringRule: {
        select: { name: true, type: true, amount: true },
      },
    },
    orderBy: { scheduledDate: "asc" },
    take: 10,
  });

  for (const occurrence of due) {
    await ensureNotification(
      userId,
      "RECURRING_REMINDER",
      `Jatuh tempo: ${occurrence.recurringRule.name}`,
      `Transaksi ${occurrence.recurringRule.type.toLowerCase()} sebesar ${formatRupiah(
        Number(occurrence.recurringRule.amount),
      )} dijadwalkan pada ${occurrence.scheduledDate
        .toISOString()
        .slice(0, 10)}.`,
      addDays(day, -7),
    );
  }

  if (now.getDate() <= 3) {
    await ensureNotification(
      userId,
      "SYSTEM",
      "Evaluasi keuangan bulan lalu",
      "Buka halaman Laporan untuk membandingkan pemasukan dan pengeluaran bulan lalu.",
      monthStart,
    );
  }
}

export async function listNotifications(
  userId: string,
): Promise<NotificationList> {
  await syncNotifications(userId);

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return { notifications: notifications.map(toView), unreadCount };
}

export async function countUnreadNotifications(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });

  if (result.count === 0) {
    throw new ServiceError("Notifikasi tidak ditemukan.", 404);
  }
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
