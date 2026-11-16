import type { TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  CashFlowPoint,
  ExpenseCategorySlice,
} from "@/services/dashboard.service";
import { listTransactions, type TransactionView } from "@/services/transaction.service";

export type ReportPeriod = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export const REPORT_PERIODS: ReportPeriod[] = [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
];

export const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  DAILY: "Harian",
  WEEKLY: "Mingguan",
  MONTHLY: "Bulanan",
  YEARLY: "Tahunan",
};

export type ReportComparison = {
  label: string;
  income: number;
  expense: number;
  incomeDelta: number | null;
  expenseDelta: number | null;
};

export type ReportData = {
  period: ReportPeriod;
  anchor: string;
  label: string;
  summary: {
    income: number;
    expense: number;
    net: number;
    transactionCount: number;
  };
  comparison: ReportComparison;
  trend: CashFlowPoint[];
  expenseByCategory: ExpenseCategorySlice[];
  transactions: TransactionView[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

const DATE_LONG = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const DAY_MONTH = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

const MONTH_SHORT = new Intl.DateTimeFormat("id-ID", {
  month: "short",
  timeZone: "UTC",
});

const MONTH_LONG = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function utcToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function resolveReportInput(
  periodRaw?: string | null,
  dateRaw?: string | null,
): { period: ReportPeriod; anchor: Date } {
  const period = REPORT_PERIODS.includes(periodRaw as ReportPeriod)
    ? (periodRaw as ReportPeriod)
    : "MONTHLY";

  let anchor = utcToday();

  if (dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    const [year, month, day] = dateRaw.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(parsed.getTime())) {
      anchor = parsed;
    }
  }

  return { period, anchor };
}

function resolveRange(period: ReportPeriod, anchor: Date) {
  if (period === "DAILY") {
    return {
      start: anchor,
      end: addDays(anchor, 1),
      label: DATE_LONG.format(anchor),
    };
  }

  if (period === "WEEKLY") {
    const day = anchor.getUTCDay();
    const diff = (day + 6) % 7;
    const start = addDays(anchor, -diff);
    const end = addDays(start, 7);
    return {
      start,
      end,
      label: `${DAY_MONTH.format(start)} – ${DATE_LONG.format(addDays(end, -1))}`,
    };
  }

  if (period === "MONTHLY") {
    const start = new Date(
      Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1),
    );
    const end = new Date(
      Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1),
    );
    return { start, end, label: MONTH_LONG.format(start) };
  }

  const start = new Date(Date.UTC(anchor.getUTCFullYear(), 0, 1));
  const end = new Date(Date.UTC(anchor.getUTCFullYear() + 1, 0, 1));
  return { start, end, label: String(anchor.getUTCFullYear()) };
}

function bucketKey(period: ReportPeriod, date: Date) {
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());

  if (period === "MONTHLY") return `${year}-${month}`;
  if (period === "YEARLY") return `${year}`;
  return `${year}-${month}-${day}`;
}

function buildTrendBuckets(period: ReportPeriod, anchor: Date) {
  const buckets: Array<{ key: string; label: string; start: Date; end: Date }> =
    [];

  if (period === "DAILY") {
    for (let offset = 6; offset >= 0; offset -= 1) {
      const start = addDays(anchor, -offset);
      buckets.push({
        key: bucketKey(period, start),
        label: DAY_MONTH.format(start),
        start,
        end: addDays(start, 1),
      });
    }
    return buckets;
  }

  if (period === "WEEKLY") {
    const day = anchor.getUTCDay();
    const diff = (day + 6) % 7;
    const weekStart = addDays(anchor, -diff);

    for (let offset = 0; offset < 7; offset += 1) {
      const start = addDays(weekStart, offset);
      buckets.push({
        key: bucketKey(period, start),
        label: DAY_MONTH.format(start),
        start,
        end: addDays(start, 1),
      });
    }
    return buckets;
  }

  if (period === "MONTHLY") {
    for (let offset = 5; offset >= 0; offset -= 1) {
      const start = new Date(
        Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - offset, 1),
      );
      const end = new Date(
        Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - offset + 1, 1),
      );
      buckets.push({
        key: bucketKey(period, start),
        label: MONTH_SHORT.format(start),
        start,
        end,
      });
    }
    return buckets;
  }

  for (let offset = 4; offset >= 0; offset -= 1) {
    const start = new Date(Date.UTC(anchor.getUTCFullYear() - offset, 0, 1));
    const end = new Date(
      Date.UTC(anchor.getUTCFullYear() - offset + 1, 0, 1),
    );
    buckets.push({
      key: bucketKey(period, start),
      label: String(start.getUTCFullYear()),
      start,
      end,
    });
  }

  return buckets;
}

function toDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

function deltaFor(
  rows: Array<{ type: TransactionType; amount: bigint | null }>,
  type: TransactionType,
) {
  return Number(rows.find((row) => row.type === type)?.amount ?? 0n);
}

export async function getReportData(
  userId: string,
  period: ReportPeriod,
  anchor: Date,
  transactionTake = 200,
): Promise<ReportData> {
  const range = resolveRange(period, anchor);
  const previousRange = resolveRange(period, addDays(range.start, -1));
  const buckets = buildTrendBuckets(period, anchor);
  const trendStart = buckets[0].start;
  const trendEnd = buckets[buckets.length - 1].end;

  const [currentSums, previousSums, trendTransactions, expenseTransactions, transactions] =
    await Promise.all([
      prisma.financialTransaction.groupBy({
        by: ["type"],
        where: {
          userId,
          status: "POSTED",
          type: { in: ["INCOME", "EXPENSE"] },
          transactionDate: { gte: range.start, lt: range.end },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.financialTransaction.groupBy({
        by: ["type"],
        where: {
          userId,
          status: "POSTED",
          type: { in: ["INCOME", "EXPENSE"] },
          transactionDate: {
            gte: previousRange.start,
            lt: previousRange.end,
          },
        },
        _sum: { amount: true },
      }),
      prisma.financialTransaction.findMany({
        where: {
          userId,
          status: "POSTED",
          type: { in: ["INCOME", "EXPENSE"] },
          transactionDate: { gte: trendStart, lt: trendEnd },
        },
        select: { type: true, amount: true, transactionDate: true },
      }),
      prisma.financialTransaction.findMany({
        where: {
          userId,
          type: "EXPENSE",
          status: "POSTED",
          transactionDate: { gte: range.start, lt: range.end },
        },
        select: {
          amount: true,
          categoryId: true,
          category: { select: { name: true } },
        },
      }),
      listTransactions(userId, {
        from: range.start,
        to: new Date(range.end.getTime() - 1),
        take: transactionTake,
      }),
    ]);

  const currentRows = currentSums.map((row) => ({
    type: row.type,
    amount: row._sum.amount,
  }));
  const previousRows = previousSums.map((row) => ({
    type: row.type,
    amount: row._sum.amount,
  }));

  const income = deltaFor(currentRows, "INCOME");
  const expense = deltaFor(currentRows, "EXPENSE");
  const previousIncome = deltaFor(previousRows, "INCOME");
  const previousExpense = deltaFor(previousRows, "EXPENSE");

  const bucketTotals = new Map(
    buckets.map((bucket) => [bucket.key, { income: 0n, expense: 0n }]),
  );

  for (const transaction of trendTransactions) {
    const key = bucketKey(period, transaction.transactionDate);
    const bucket = bucketTotals.get(key);
    if (!bucket) continue;

    if (transaction.type === "INCOME") {
      bucket.income += transaction.amount;
    } else {
      bucket.expense += transaction.amount;
    }
  }

  const trend: CashFlowPoint[] = buckets.map((bucket) => {
    const totals = bucketTotals.get(bucket.key) ?? { income: 0n, expense: 0n };
    return {
      label: bucket.label,
      income: Number(totals.income),
      expense: Number(totals.expense),
    };
  });

  const categoryTotals = new Map<string, { name: string; amount: bigint }>();
  let totalExpense = 0n;

  for (const transaction of expenseTransactions) {
    totalExpense += transaction.amount;
    const key = transaction.categoryId ?? "uncategorized";
    const entry = categoryTotals.get(key) ?? {
      name: transaction.category?.name ?? "Tanpa kategori",
      amount: 0n,
    };
    entry.amount += transaction.amount;
    categoryTotals.set(key, entry);
  }

  const sorted = [...categoryTotals.entries()]
    .map(([id, entry]) => ({
      id: id === "uncategorized" ? null : id,
      name: entry.name,
      amount: entry.amount,
    }))
    .sort((a, b) => (a.amount > b.amount ? -1 : a.amount < b.amount ? 1 : 0));

  const top = sorted.slice(0, 7);
  const rest = sorted
    .slice(7)
    .reduce((sum, entry) => sum + entry.amount, 0n);
  const toShare = (amount: bigint) =>
    totalExpense > 0n ? Number(amount) / Number(totalExpense) : 0;

  const expenseByCategory: ExpenseCategorySlice[] = top.map((entry) => ({
    id: entry.id,
    name: entry.name,
    amount: Number(entry.amount),
    share: toShare(entry.amount),
  }));

  if (rest > 0n) {
    expenseByCategory.push({
      id: "rest",
      name: "Kategori lain",
      amount: Number(rest),
      share: toShare(rest),
    });
  }

  const transactionCount = currentSums.reduce(
    (sum, row) => sum + row._count._all,
    0,
  );

  return {
    period,
    anchor: anchor.toISOString().slice(0, 10),
    label: range.label,
    summary: {
      income,
      expense,
      net: income - expense,
      transactionCount,
    },
    comparison: {
      label: previousRange.label,
      income: previousIncome,
      expense: previousExpense,
      incomeDelta: toDelta(income, previousIncome),
      expenseDelta: toDelta(expense, previousExpense),
    },
    trend,
    expenseByCategory,
    transactions,
  };
}

const TYPE_LABELS: Record<string, string> = {
  INCOME: "Pemasukan",
  EXPENSE: "Pengeluaran",
  TRANSFER: "Transfer",
  OPENING_BALANCE: "Saldo awal",
  ADJUSTMENT: "Penyesuaian",
  REVERSAL: "Reversal",
};

function csvCell(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function getReportCsv(
  userId: string,
  period: ReportPeriod,
  anchor: Date,
): Promise<{ filename: string; csv: string }> {
  const range = resolveRange(period, anchor);
  const transactions = await listTransactions(userId, {
    from: range.start,
    to: new Date(range.end.getTime() - 1),
    take: 1000,
  });

  const header = [
    "Tanggal",
    "Tipe",
    "Status",
    "Kategori",
    "Rekening",
    "Deskripsi",
    "Nominal",
  ];

  const rows = transactions.map((transaction) => {
    const account =
      transaction.type === "TRANSFER"
        ? `${transaction.sourceAccount?.name ?? "-"} -> ${
            transaction.destinationAccount?.name ?? "-"
          }`
        : transaction.account?.name ?? "-";

    return [
      transaction.transactionDate,
      TYPE_LABELS[transaction.type] ?? transaction.type,
      transaction.status,
      transaction.category?.name ?? "-",
      account,
      transaction.description ?? "",
      String(transaction.amount),
    ].map(csvCell);
  });

  const csv = [header.map(csvCell).join(","), ...rows.map((row) => row.join(","))].join(
    "\r\n",
  );

  return {
    filename: `rifintrack-${period.toLowerCase()}-${anchor
      .toISOString()
      .slice(0, 10)}.csv`,
    csv,
  };
}
