import { prisma } from "@/lib/prisma";
import { listAccounts } from "@/services/account.service";
import { listTransactions, type TransactionView } from "@/services/transaction.service";

export type CashFlowPoint = {
  label: string;
  income: number;
  expense: number;
};

export type ExpenseCategorySlice = {
  id: string | null;
  name: string;
  amount: number;
  share: number;
};

export type BudgetSummaryView = {
  name: string;
  totalLimit: number;
  totalSpent: number;
  share: number;
  items: Array<{
    id: string;
    name: string;
    limit: number;
    spent: number;
    share: number;
  }>;
};

export type DashboardData = {
  monthLabel: string;
  totalBalance: number;
  activeAccounts: number;
  monthlyIncome: number;
  monthlyExpense: number;
  totalSavings: number;
  cashFlow: CashFlowPoint[];
  expenseByCategory: ExpenseCategorySlice[];
  budget: BudgetSummaryView | null;
  recentTransactions: TransactionView[];
};

const MONTH_SHORT = new Intl.DateTimeFormat("id-ID", {
  month: "short",
  timeZone: "UTC",
});

const MONTH_LONG = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function startOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1));
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const months = Array.from({ length: 6 }, (_, index) => {
    const offset = 5 - index;
    const start = startOfMonth(currentYear, currentMonth - offset);
    const end = startOfMonth(currentYear, currentMonth - offset + 1);
    return {
      key: `${start.getUTCFullYear()}-${start.getUTCMonth() + 1}`,
      label: MONTH_SHORT.format(start),
      start,
      end,
    };
  });

  const rangeStart = months[0].start;
  const rangeEnd = months[months.length - 1].end;
  const current = months[months.length - 1];

  const [accounts, budgetRecord, savingsRows, recentTransactions, transactions] =
    await Promise.all([
      listAccounts(userId),
      prisma.budget.findUnique({
        where: {
          userId_year_month: {
            userId,
            year: currentYear,
            month: currentMonth + 1,
          },
        },
        include: {
          categoryLimits: {
            where: { category: { is: { isArchived: false } } },
            include: { category: { select: { id: true, name: true } } },
          },
        },
      }),
      prisma.goalMovement.groupBy({
        by: ["type"],
        where: { goal: { userId } },
        _sum: { amount: true },
      }),
      listTransactions(userId, { take: 5 }),
      prisma.financialTransaction.findMany({
        where: {
          userId,
          status: "POSTED",
          type: { in: ["INCOME", "EXPENSE"] },
          transactionDate: { gte: rangeStart, lt: rangeEnd },
        },
        select: {
          type: true,
          amount: true,
          transactionDate: true,
          categoryId: true,
          category: { select: { name: true } },
        },
      }),
    ]);

  const totalBalance = accounts
    .filter((account) => !account.isArchived)
    .reduce((sum, account) => sum + account.balance, 0);

  const buckets = new Map(
    months.map((month) => [month.key, { income: 0n, expense: 0n }]),
  );

  for (const transaction of transactions) {
    const date = transaction.transactionDate;
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;

    if (transaction.type === "INCOME") {
      bucket.income += transaction.amount;
    } else {
      bucket.expense += transaction.amount;
    }
  }

  const cashFlow: CashFlowPoint[] = months.map((month) => {
    const bucket = buckets.get(month.key) ?? { income: 0n, expense: 0n };
    return {
      label: month.label,
      income: Number(bucket.income),
      expense: Number(bucket.expense),
    };
  });

  const currentBucket = buckets.get(current.key) ?? {
    income: 0n,
    expense: 0n,
  };

  const expenseByCategoryId = new Map<
    string,
    { name: string; amount: bigint }
  >();

  let totalExpense = 0n;

  for (const transaction of transactions) {
    if (transaction.type !== "EXPENSE") continue;
    if (transaction.transactionDate < current.start) continue;
    if (transaction.transactionDate >= current.end) continue;

    totalExpense += transaction.amount;

    const key = transaction.categoryId ?? "uncategorized";
    const entry = expenseByCategoryId.get(key) ?? {
      name: transaction.category?.name ?? "Tanpa kategori",
      amount: 0n,
    };
    entry.amount += transaction.amount;
    expenseByCategoryId.set(key, entry);
  }

  const sortedExpenses = [...expenseByCategoryId.entries()]
    .map(([id, entry]) => ({
      id: id === "uncategorized" ? null : id,
      name: entry.name,
      amount: entry.amount,
    }))
    .sort((a, b) => (a.amount > b.amount ? -1 : a.amount < b.amount ? 1 : 0));

  const top = sortedExpenses.slice(0, 7);
  const rest = sortedExpenses
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

  let totalSavings = 0n;
  for (const row of savingsRows) {
    const amount = row._sum.amount ?? 0n;
    totalSavings += row.type === "CONTRIBUTION" ? amount : -amount;
  }

  let budget: BudgetSummaryView | null = null;

  if (budgetRecord && budgetRecord.categoryLimits.length > 0) {
    const items = budgetRecord.categoryLimits
      .map((limit) => {
        const spent = expenseByCategoryId.get(limit.categoryId)?.amount ?? 0n;
        return {
          id: limit.categoryId,
          name: limit.category.name,
          limit: Number(limit.limitAmount),
          spent: Number(spent),
          share:
            limit.limitAmount > 0n
              ? Number(spent) / Number(limit.limitAmount)
              : 0,
        };
      })
      .sort((a, b) => b.share - a.share)
      .slice(0, 4);

    const totalLimit = budgetRecord.categoryLimits.reduce(
      (sum, limit) => sum + limit.limitAmount,
      0n,
    );
    const totalSpent = budgetRecord.categoryLimits.reduce(
      (sum, limit) =>
        sum + (expenseByCategoryId.get(limit.categoryId)?.amount ?? 0n),
      0n,
    );

    budget = {
      name: budgetRecord.name,
      totalLimit: Number(totalLimit),
      totalSpent: Number(totalSpent),
      share: totalLimit > 0n ? Number(totalSpent) / Number(totalLimit) : 0,
      items,
    };
  }

  return {
    monthLabel: MONTH_LONG.format(current.start),
    totalBalance,
    activeAccounts: accounts.filter((account) => !account.isArchived).length,
    monthlyIncome: Number(currentBucket.income),
    monthlyExpense: Number(currentBucket.expense),
    totalSavings: Number(totalSavings),
    cashFlow,
    expenseByCategory,
    budget,
    recentTransactions,
  };
}
