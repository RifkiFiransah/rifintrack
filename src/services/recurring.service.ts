import {
  Prisma,
  type OccurrenceStatus,
  type TransactionType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/service-error";
import { createTransaction } from "@/services/transaction.service";

type RecurringRuleCreateInput = {
  name: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  dayOfMonth?: number | null;
  startDate: Date;
  endDate?: Date | null;
  accountId?: string | null;
  categoryId?: string | null;
  sourceAccountId?: string | null;
  destinationAccountId?: string | null;
};

const ruleInclude = {
  account: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
  sourceAccount: { select: { id: true, name: true } },
  destinationAccount: { select: { id: true, name: true } },
  occurrences: {
    orderBy: { scheduledDate: "desc" as const },
    take: 400,
  },
} satisfies Prisma.RecurringRuleInclude;

type RuleRecord = Prisma.RecurringRuleGetPayload<{ include: typeof ruleInclude }>;

export type RecurringOccurrenceView = {
  id: string;
  scheduledDate: string;
  status: OccurrenceStatus;
  transactionId: string | null;
};

export type RecurringRuleView = {
  id: string;
  name: string;
  type: TransactionType;
  amount: number;
  frequency: string;
  interval: number;
  dayOfMonth: number | null;
  startDate: string;
  endDate: string | null;
  nextRunAt: string | null;
  isActive: boolean;
  account: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  sourceAccount: { id: string; name: string } | null;
  destinationAccount: { id: string; name: string } | null;
  occurrences: RecurringOccurrenceView[];
};

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toView(record: RuleRecord): RecurringRuleView {
  const today = startOfToday();
  const occurrences: RecurringOccurrenceView[] = record.occurrences
    .map((occurrence) => ({
      id: occurrence.id,
      scheduledDate: toDateString(occurrence.scheduledDate),
      status: occurrence.status,
      transactionId: occurrence.transactionId,
    }))
    .sort((a, b) => {
      const aDue = a.status === "SCHEDULED" && a.scheduledDate <= toDateString(today);
      const bDue = b.status === "SCHEDULED" && b.scheduledDate <= toDateString(today);

      if (aDue !== bDue) return aDue ? -1 : 1;

      if (aDue && bDue) return a.scheduledDate.localeCompare(b.scheduledDate);

      if (a.status === "SCHEDULED" && b.status === "SCHEDULED") {
        return a.scheduledDate.localeCompare(b.scheduledDate);
      }

      if (a.status !== "SCHEDULED" && b.status !== "SCHEDULED") {
        return b.scheduledDate.localeCompare(a.scheduledDate);
      }

      return a.status === "SCHEDULED" ? -1 : 1;
    })
    .slice(0, 24);

  return {
    id: record.id,
    name: record.name,
    type: record.type,
    amount: Number(record.amount),
    frequency: record.frequency,
    interval: record.interval,
    dayOfMonth: record.dayOfMonth,
    startDate: toDateString(record.startDate),
    endDate: record.endDate ? toDateString(record.endDate) : null,
    nextRunAt: record.nextRunAt ? toDateString(record.nextRunAt) : null,
    isActive: record.isActive,
    account: record.account,
    category: record.category,
    sourceAccount: record.sourceAccount,
    destinationAccount: record.destinationAccount,
    occurrences,
  };
}

const DAY_MS = 86_400_000;

function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function addMonthsWithDay(base: Date, months: number, day: number) {
  const year = base.getUTCFullYear();
  const monthIndex = base.getUTCMonth() + months;
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const daysInTarget = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();

  return new Date(
    Date.UTC(
      first.getUTCFullYear(),
      first.getUTCMonth(),
      Math.min(day, daysInTarget),
    ),
  );
}

type ScheduleRule = Pick<
  RecurringRuleCreateInput,
  "startDate" | "endDate" | "frequency" | "interval" | "dayOfMonth"
>;

function buildSchedule(rule: ScheduleRule): Date[] {
  const today = startOfToday();
  const windowStart = addDays(today, -180);
  const horizon = addDays(today, 30);
  const cutoff =
    rule.endDate && rule.endDate < horizon ? startOfDay(rule.endDate) : horizon;
  const start = startOfDay(rule.startDate);
  const out: Date[] = [];

  if (cutoff < start) {
    return out;
  }

  const monthDay = rule.dayOfMonth ?? start.getUTCDate();

  if (rule.frequency === "DAILY" || rule.frequency === "WEEKLY") {
    const stepDays =
      rule.frequency === "DAILY" ? rule.interval : rule.interval * 7;
    const stepMs = stepDays * DAY_MS;
    const startIndex = Math.max(
      0,
      Math.ceil((windowStart.getTime() - start.getTime()) / stepMs),
    );

    for (let i = startIndex; out.length < 400; i += 1) {
      const date = addDays(start, i * stepDays);
      if (date > cutoff) break;
      if (date >= windowStart) out.push(date);
    }

    return out;
  }

  if (rule.frequency === "MONTHLY") {
    const startMonth = start.getUTCFullYear() * 12 + start.getUTCMonth();
    const windowMonth =
      windowStart.getUTCFullYear() * 12 + windowStart.getUTCMonth();
    const startIndex = Math.max(
      0,
      Math.floor((windowMonth - startMonth) / rule.interval),
    );

    for (let i = startIndex; out.length < 400; i += 1) {
      const date = addMonthsWithDay(start, i * rule.interval, monthDay);
      if (date > cutoff) break;
      if (date >= start && date >= windowStart) out.push(date);
    }

    return out;
  }

  const startIndex = Math.max(
    0,
    Math.floor(
      (windowStart.getUTCFullYear() - start.getUTCFullYear()) / rule.interval,
    ),
  );

  for (let i = startIndex; out.length < 400; i += 1) {
    const date = addMonthsWithDay(start, i * rule.interval * 12, monthDay);
    if (date > cutoff) break;
    if (date >= start && date >= windowStart) out.push(date);
  }

  return out;
}

function startOfDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

async function refreshNextRun(ruleId: string) {
  const next = await prisma.recurringOccurrence.findFirst({
    where: { recurringRuleId: ruleId, status: "SCHEDULED" },
    orderBy: { scheduledDate: "asc" },
  });

  await prisma.recurringRule.update({
    where: { id: ruleId },
    data: { nextRunAt: next?.scheduledDate ?? null },
  });
}

async function syncRuleOccurrences(rule: ScheduleRule & { id: string }) {
  const dates = buildSchedule(rule);

  if (dates.length > 0) {
    await prisma.recurringOccurrence.createMany({
      data: dates.map((scheduledDate) => ({
        recurringRuleId: rule.id,
        scheduledDate,
      })),
      skipDuplicates: true,
    });
  }

  await refreshNextRun(rule.id);
}

export async function ensureRecurringOccurrences(userId: string) {
  const rules = await prisma.recurringRule.findMany({
    where: { userId, isActive: true },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      frequency: true,
      interval: true,
      dayOfMonth: true,
    },
  });

  await Promise.all(rules.map(syncRuleOccurrences));
}

async function getRuleView(userId: string, ruleId: string) {
  const record = await prisma.recurringRule.findFirst({
    where: { id: ruleId, userId },
    include: ruleInclude,
  });

  if (!record) {
    throw new ServiceError("Transaksi rutin tidak ditemukan.", 404);
  }

  return toView(record);
}

async function assertAccount(
  userId: string,
  accountId: string | null | undefined,
) {
  if (!accountId) {
    throw new ServiceError("Rekening wajib diisi.");
  }

  const account = await prisma.account.findFirst({
    where: { id: accountId, userId, isArchived: false },
  });

  if (!account) {
    throw new ServiceError("Rekening tidak ditemukan.", 404);
  }
}

async function assertCategory(
  userId: string,
  categoryId: string | null | undefined,
  type: "INCOME" | "EXPENSE",
) {
  if (!categoryId) {
    throw new ServiceError("Kategori wajib diisi.");
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId, isArchived: false },
  });

  if (!category) {
    throw new ServiceError("Kategori tidak ditemukan.", 404);
  }
  if (category.type !== type) {
    throw new ServiceError("Kategori tidak sesuai dengan tipe transaksi.");
  }
}

export async function listRecurringRules(
  userId: string,
): Promise<RecurringRuleView[]> {
  await ensureRecurringOccurrences(userId);

  const records = await prisma.recurringRule.findMany({
    where: { userId },
    include: ruleInclude,
    orderBy: [
      { isActive: "desc" },
      { nextRunAt: "asc" },
      { createdAt: "asc" },
    ],
  });

  return records.map(toView);
}

export async function createRecurringRule(
  userId: string,
  input: RecurringRuleCreateInput,
): Promise<RecurringRuleView> {
  const startDate = startOfDay(input.startDate);
  const endDate = input.endDate ? startOfDay(input.endDate) : null;

  if (input.type === "TRANSFER") {
    await assertAccount(userId, input.sourceAccountId);
    await assertAccount(userId, input.destinationAccountId);
  } else {
    await assertAccount(userId, input.accountId);
    await assertCategory(userId, input.categoryId, input.type);
  }

  const created = await prisma.recurringRule.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      amount: BigInt(input.amount),
      frequency: input.frequency,
      interval: input.interval,
      dayOfMonth:
        input.frequency === "MONTHLY"
          ? input.dayOfMonth ?? startDate.getUTCDate()
          : input.dayOfMonth ?? null,
      accountId: input.type === "TRANSFER" ? null : input.accountId ?? null,
      categoryId: input.type === "TRANSFER" ? null : input.categoryId ?? null,
      sourceAccountId:
        input.type === "TRANSFER" ? input.sourceAccountId ?? null : null,
      destinationAccountId:
        input.type === "TRANSFER" ? input.destinationAccountId ?? null : null,
      startDate,
      endDate,
      nextRunAt: startDate,
    },
  });

  await syncRuleOccurrences(created);

  return getRuleView(userId, created.id);
}

export async function setRecurringRuleActive(
  userId: string,
  ruleId: string,
  isActive: boolean,
): Promise<RecurringRuleView> {
  const rule = await prisma.recurringRule.findFirst({
    where: { id: ruleId, userId },
  });

  if (!rule) {
    throw new ServiceError("Transaksi rutin tidak ditemukan.", 404);
  }

  await prisma.recurringRule.update({
    where: { id: ruleId },
    data: { isActive },
  });

  if (isActive) {
    await syncRuleOccurrences(rule);
  }

  return getRuleView(userId, ruleId);
}

export async function postRecurringOccurrence(
  userId: string,
  occurrenceId: string,
): Promise<RecurringRuleView> {
  const occurrence = await prisma.recurringOccurrence.findFirst({
    where: { id: occurrenceId, recurringRule: { userId } },
    include: { recurringRule: true },
  });

  if (!occurrence) {
    throw new ServiceError("Jadwal transaksi tidak ditemukan.", 404);
  }
  if (occurrence.status !== "SCHEDULED") {
    throw new ServiceError("Jadwal ini sudah diproses.");
  }
  if (!occurrence.recurringRule.isActive) {
    throw new ServiceError("Transaksi rutin sedang nonaktif.");
  }
  if (occurrence.scheduledDate > startOfToday()) {
    throw new ServiceError("Jadwal ini belum jatuh tempo.");
  }

  const rule = occurrence.recurringRule;
  const transaction = await createTransaction(userId, {
    type: rule.type as "INCOME" | "EXPENSE" | "TRANSFER",
    amount: Number(rule.amount),
    transactionDate: occurrence.scheduledDate,
    categoryId: rule.categoryId,
    accountId: rule.accountId,
    sourceAccountId: rule.sourceAccountId,
    destinationAccountId: rule.destinationAccountId,
    description: rule.name,
    idempotencyKey: `recurring-${occurrence.id}`,
  });

  await prisma.recurringOccurrence.update({
    where: { id: occurrence.id },
    data: { status: "POSTED", transactionId: transaction.id },
  });

  await refreshNextRun(rule.id);

  return getRuleView(userId, rule.id);
}

export async function skipRecurringOccurrence(
  userId: string,
  occurrenceId: string,
): Promise<RecurringRuleView> {
  const occurrence = await prisma.recurringOccurrence.findFirst({
    where: { id: occurrenceId, recurringRule: { userId } },
    include: { recurringRule: true },
  });

  if (!occurrence) {
    throw new ServiceError("Jadwal transaksi tidak ditemukan.", 404);
  }
  if (occurrence.status !== "SCHEDULED") {
    throw new ServiceError("Jadwal ini sudah diproses.");
  }

  await prisma.recurringOccurrence.update({
    where: { id: occurrence.id },
    data: { status: "SKIPPED" },
  });

  await refreshNextRun(occurrence.recurringRuleId);

  return getRuleView(userId, occurrence.recurringRuleId);
}
