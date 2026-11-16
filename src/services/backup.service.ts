import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/service-error";

const dateString = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Tanggal tidak valid");

const amount = z.number().int().min(0);

const ledgerEntrySchema = z.object({
  id: z.string().min(1),
  accountId: z.string().min(1),
  direction: z.enum(["DEBIT", "CREDIT"]),
  amount,
  createdAt: dateString,
});

const accountSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["BANK", "E_WALLET", "CASH", "OTHER"]),
  institution: z.string().nullish(),
  openingBalance: amount,
  openingDate: dateString,
  color: z.string().nullish(),
  icon: z.string().nullish(),
  isArchived: z.boolean(),
  createdAt: dateString,
});

const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["INCOME", "EXPENSE"]),
  parentId: z.string().nullish(),
  icon: z.string().nullish(),
  color: z.string().nullish(),
  isArchived: z.boolean(),
  createdAt: dateString,
});

const transactionSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().nullish(),
  accountId: z.string().nullish(),
  sourceAccountId: z.string().nullish(),
  destinationAccountId: z.string().nullish(),
  type: z.enum([
    "INCOME",
    "EXPENSE",
    "TRANSFER",
    "OPENING_BALANCE",
    "ADJUSTMENT",
  ]),
  status: z.enum(["PENDING", "POSTED", "REVERSED", "VOIDED"]),
  amount,
  transactionDate: dateString,
  description: z.string().nullish(),
  notes: z.string().nullish(),
  idempotencyKey: z.string().nullish(),
  createdAt: dateString,
  postedAt: dateString.nullish(),
  voidedAt: dateString.nullish(),
  ledgerEntries: z.array(ledgerEntrySchema).default([]),
});

const budgetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  notes: z.string().nullish(),
  createdAt: dateString,
  limits: z.array(
    z.object({
      id: z.string().min(1),
      categoryId: z.string().min(1),
      limitAmount: amount,
      createdAt: dateString,
    }),
  ),
});

const goalSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum([
    "EMERGENCY_FUND",
    "PERSONAL_SAVINGS",
    "PURCHASE",
    "TRAVEL",
    "OTHER",
  ]),
  targetAmount: amount,
  targetDate: dateString.nullish(),
  description: z.string().nullish(),
  color: z.string().nullish(),
  isCompleted: z.boolean(),
  createdAt: dateString,
  movements: z.array(
    z.object({
      id: z.string().min(1),
      transactionId: z.string().nullish(),
      type: z.enum(["CONTRIBUTION", "WITHDRAWAL"]),
      amount,
      movementDate: dateString,
      notes: z.string().nullish(),
      createdAt: dateString,
    }),
  ),
});

const recurringRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  amount,
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  interval: z.number().int().min(1).max(365),
  dayOfMonth: z.number().int().min(1).max(31).nullish(),
  dayOfWeek: z.number().int().min(0).max(6).nullish(),
  accountId: z.string().nullish(),
  categoryId: z.string().nullish(),
  sourceAccountId: z.string().nullish(),
  destinationAccountId: z.string().nullish(),
  startDate: dateString,
  endDate: dateString.nullish(),
  nextRunAt: dateString.nullish(),
  isActive: z.boolean(),
  createdAt: dateString,
  occurrences: z.array(
    z.object({
      id: z.string().min(1),
      transactionId: z.string().nullish(),
      scheduledDate: dateString,
      status: z.enum(["SCHEDULED", "POSTED", "SKIPPED"]),
      createdAt: dateString,
    }),
  ),
});

const backupSchema = z.object({
  format: z.literal("rifintrack-backup"),
  version: z.literal(1),
  exportedAt: z.string(),
  user: z.object({ fullName: z.string(), email: z.string() }),
  accounts: z.array(accountSchema),
  categories: z.array(categorySchema),
  transactions: z.array(transactionSchema),
  budgets: z.array(budgetSchema),
  savingsGoals: z.array(goalSchema),
  recurringRules: z.array(recurringRuleSchema),
});

type Backup = z.infer<typeof backupSchema>;

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function day(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function exportBackup(userId: string) {
  const [user, accounts, categories, transactions, budgets, goals, rules] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { fullName: true, email: true },
      }),
      prisma.account.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.category.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.financialTransaction.findMany({
        where: { userId },
        include: { ledgerEntries: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.budget.findMany({
        where: { userId },
        include: { categoryLimits: true },
        orderBy: [{ year: "asc" }, { month: "asc" }],
      }),
      prisma.savingsGoal.findMany({
        where: { userId },
        include: { movements: { orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.recurringRule.findMany({
        where: { userId },
        include: { occurrences: { orderBy: { scheduledDate: "asc" } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  return {
    format: "rifintrack-backup" as const,
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    user,
    accounts: accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      institution: account.institution,
      openingBalance: Number(account.openingBalance),
      openingDate: day(account.openingDate),
      color: account.color,
      icon: account.icon,
      isArchived: account.isArchived,
      createdAt: iso(account.createdAt)!,
    })),
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      type: category.type,
      parentId: category.parentId,
      icon: category.icon,
      color: category.color,
      isArchived: category.isArchived,
      createdAt: iso(category.createdAt)!,
    })),
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      categoryId: transaction.categoryId,
      accountId: transaction.accountId,
      sourceAccountId: transaction.sourceAccountId,
      destinationAccountId: transaction.destinationAccountId,
      type: transaction.type,
      status: transaction.status,
      amount: Number(transaction.amount),
      transactionDate: day(transaction.transactionDate),
      description: transaction.description,
      notes: transaction.notes,
      idempotencyKey: transaction.idempotencyKey,
      createdAt: iso(transaction.createdAt)!,
      postedAt: iso(transaction.postedAt),
      voidedAt: iso(transaction.voidedAt),
      ledgerEntries: transaction.ledgerEntries.map((entry) => ({
        id: entry.id,
        accountId: entry.accountId,
        direction: entry.direction,
        amount: Number(entry.amount),
        createdAt: iso(entry.createdAt)!,
      })),
    })),
    budgets: budgets.map((budget) => ({
      id: budget.id,
      name: budget.name,
      year: budget.year,
      month: budget.month,
      notes: budget.notes,
      createdAt: iso(budget.createdAt)!,
      limits: budget.categoryLimits.map((limit) => ({
        id: limit.id,
        categoryId: limit.categoryId,
        limitAmount: Number(limit.limitAmount),
        createdAt: iso(limit.createdAt)!,
      })),
    })),
    savingsGoals: goals.map((goal) => ({
      id: goal.id,
      name: goal.name,
      type: goal.type,
      targetAmount: Number(goal.targetAmount),
      targetDate: goal.targetDate ? day(goal.targetDate) : null,
      description: goal.description,
      color: goal.color,
      isCompleted: goal.isCompleted,
      createdAt: iso(goal.createdAt)!,
      movements: goal.movements.map((movement) => ({
        id: movement.id,
        transactionId: movement.transactionId,
        type: movement.type,
        amount: Number(movement.amount),
        movementDate: day(movement.movementDate),
        notes: movement.notes,
        createdAt: iso(movement.createdAt)!,
      })),
    })),
    recurringRules: rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      type: rule.type,
      amount: Number(rule.amount),
      frequency: rule.frequency,
      interval: rule.interval,
      dayOfMonth: rule.dayOfMonth,
      dayOfWeek: rule.dayOfWeek,
      accountId: rule.accountId,
      categoryId: rule.categoryId,
      sourceAccountId: rule.sourceAccountId,
      destinationAccountId: rule.destinationAccountId,
      startDate: day(rule.startDate),
      endDate: rule.endDate ? day(rule.endDate) : null,
      nextRunAt: rule.nextRunAt ? day(rule.nextRunAt) : null,
      isActive: rule.isActive,
      createdAt: iso(rule.createdAt)!,
      occurrences: rule.occurrences.map((occurrence) => ({
        id: occurrence.id,
        transactionId: occurrence.transactionId,
        scheduledDate: day(occurrence.scheduledDate),
        status: occurrence.status,
        createdAt: iso(occurrence.createdAt)!,
      })),
    })),
  };
}

export async function restoreBackup(userId: string, raw: unknown) {
  let backup: Backup;

  try {
    backup = backupSchema.parse(raw);
  } catch {
    throw new ServiceError(
      "File backup tidak valid atau berasal dari versi yang tidak didukung.",
      400,
    );
  }

  const categoryIds = new Set(backup.categories.map((category) => category.id));

  await prisma.$transaction(
    async (tx) => {
      await tx.attachment.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.goalMovement.deleteMany({ where: { goal: { userId } } });
      await tx.savingsGoal.deleteMany({ where: { userId } });
      await tx.recurringOccurrence.deleteMany({
        where: { recurringRule: { userId } },
      });
      await tx.recurringRule.deleteMany({ where: { userId } });
      await tx.ledgerEntry.deleteMany({ where: { transaction: { userId } } });
      await tx.financialTransaction.deleteMany({ where: { userId } });
      await tx.budgetCategoryLimit.deleteMany({
        where: { budget: { userId } },
      });
      await tx.budget.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      await tx.category.deleteMany({ where: { userId } });

      for (const category of backup.categories) {
        await tx.category.create({
          data: {
            id: category.id,
            userId,
            name: category.name,
            type: category.type,
            parentId: null,
            icon: category.icon,
            color: category.color,
            isArchived: category.isArchived,
            createdAt: new Date(category.createdAt),
          },
        });
      }

      for (const category of backup.categories) {
        if (category.parentId && categoryIds.has(category.parentId)) {
          await tx.category.update({
            where: { id: category.id },
            data: { parentId: category.parentId },
          });
        }
      }

      for (const account of backup.accounts) {
        await tx.account.create({
          data: {
            id: account.id,
            userId,
            name: account.name,
            type: account.type,
            institution: account.institution ?? null,
            openingBalance: BigInt(account.openingBalance),
            openingDate: new Date(account.openingDate),
            color: account.color ?? null,
            icon: account.icon ?? null,
            isArchived: account.isArchived,
            createdAt: new Date(account.createdAt),
          },
        });
      }

      for (const transaction of backup.transactions) {
        await tx.financialTransaction.create({
          data: {
            id: transaction.id,
            userId,
            categoryId: transaction.categoryId ?? null,
            accountId: transaction.accountId ?? null,
            sourceAccountId: transaction.sourceAccountId ?? null,
            destinationAccountId: transaction.destinationAccountId ?? null,
            type: transaction.type,
            status: transaction.status,
            amount: BigInt(transaction.amount),
            transactionDate: new Date(transaction.transactionDate),
            description: transaction.description ?? null,
            notes: transaction.notes ?? null,
            idempotencyKey: transaction.idempotencyKey ?? null,
            createdAt: new Date(transaction.createdAt),
            postedAt: transaction.postedAt
              ? new Date(transaction.postedAt)
              : null,
            voidedAt: transaction.voidedAt
              ? new Date(transaction.voidedAt)
              : null,
          },
        });
      }

      const ledgerEntries = backup.transactions.flatMap((transaction) =>
        transaction.ledgerEntries.map((entry) => ({
          id: entry.id,
          transactionId: transaction.id,
          accountId: entry.accountId,
          direction: entry.direction,
          amount: BigInt(entry.amount),
          createdAt: new Date(entry.createdAt),
        })),
      );

      if (ledgerEntries.length > 0) {
        await tx.ledgerEntry.createMany({ data: ledgerEntries });
      }

      for (const budget of backup.budgets) {
        await tx.budget.create({
          data: {
            id: budget.id,
            userId,
            name: budget.name,
            year: budget.year,
            month: budget.month,
            notes: budget.notes ?? null,
            createdAt: new Date(budget.createdAt),
          },
        });

        if (budget.limits.length > 0) {
          await tx.budgetCategoryLimit.createMany({
            data: budget.limits.map((limit) => ({
              id: limit.id,
              budgetId: budget.id,
              categoryId: limit.categoryId,
              limitAmount: BigInt(limit.limitAmount),
              createdAt: new Date(limit.createdAt),
            })),
          });
        }
      }

      for (const goal of backup.savingsGoals) {
        await tx.savingsGoal.create({
          data: {
            id: goal.id,
            userId,
            name: goal.name,
            type: goal.type,
            targetAmount: BigInt(goal.targetAmount),
            targetDate: goal.targetDate ? new Date(goal.targetDate) : null,
            description: goal.description ?? null,
            color: goal.color ?? null,
            isCompleted: goal.isCompleted,
            createdAt: new Date(goal.createdAt),
          },
        });

        if (goal.movements.length > 0) {
          await tx.goalMovement.createMany({
            data: goal.movements.map((movement) => ({
              id: movement.id,
              goalId: goal.id,
              transactionId: movement.transactionId ?? null,
              type: movement.type,
              amount: BigInt(movement.amount),
              movementDate: new Date(movement.movementDate),
              notes: movement.notes ?? null,
              createdAt: new Date(movement.createdAt),
            })),
          });
        }
      }

      for (const rule of backup.recurringRules) {
        await tx.recurringRule.create({
          data: {
            id: rule.id,
            userId,
            name: rule.name,
            type: rule.type,
            amount: BigInt(rule.amount),
            frequency: rule.frequency,
            interval: rule.interval,
            dayOfMonth: rule.dayOfMonth ?? null,
            dayOfWeek: rule.dayOfWeek ?? null,
            accountId: rule.accountId ?? null,
            categoryId: rule.categoryId ?? null,
            sourceAccountId: rule.sourceAccountId ?? null,
            destinationAccountId: rule.destinationAccountId ?? null,
            startDate: new Date(rule.startDate),
            endDate: rule.endDate ? new Date(rule.endDate) : null,
            nextRunAt: rule.nextRunAt ? new Date(rule.nextRunAt) : null,
            isActive: rule.isActive,
            createdAt: new Date(rule.createdAt),
          },
        });

        if (rule.occurrences.length > 0) {
          await tx.recurringOccurrence.createMany({
            data: rule.occurrences.map((occurrence) => ({
              id: occurrence.id,
              recurringRuleId: rule.id,
              transactionId: occurrence.transactionId ?? null,
              scheduledDate: new Date(occurrence.scheduledDate),
              status: occurrence.status,
              createdAt: new Date(occurrence.createdAt),
            })),
          });
        }
      }
    },
    { timeout: 30_000 },
  );

  return {
    accounts: backup.accounts.length,
    categories: backup.categories.length,
    transactions: backup.transactions.length,
    budgets: backup.budgets.length,
    savingsGoals: backup.savingsGoals.length,
    recurringRules: backup.recurringRules.length,
  };
}
