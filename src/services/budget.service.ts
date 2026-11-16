import { Prisma, type CategoryType } from "@prisma/client";
import type { z } from "zod";
import {
  budgetCopySchema,
  budgetCreateSchema,
  budgetLimitSchema,
  budgetUpdateSchema,
} from "@/lib/finance-validation";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/service-error";

type BudgetCreateInput = z.infer<typeof budgetCreateSchema>;
type BudgetUpdateInput = z.infer<typeof budgetUpdateSchema>;
type BudgetLimitInput = z.infer<typeof budgetLimitSchema>;
type BudgetCopyInput = z.infer<typeof budgetCopySchema>;

export type BudgetLimitView = {
  categoryId: string;
  categoryName: string;
  categoryType: CategoryType;
  limit: number;
  spent: number;
  remaining: number;
  share: number;
};

export type BudgetView = {
  id: string;
  name: string;
  year: number;
  month: number;
  notes: string | null;
  totalLimit: number;
  totalSpent: number;
  totalRemaining: number;
  share: number;
  items: BudgetLimitView[];
};

function monthRange(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

async function buildBudgetView(
  userId: string,
  year: number,
  month: number,
): Promise<BudgetView | null> {
  const budget = await prisma.budget.findUnique({
    where: { userId_year_month: { userId, year, month } },
    include: {
      categoryLimits: {
        where: { category: { is: { isArchived: false } } },
        include: { category: { select: { id: true, name: true, type: true } } },
      },
    },
  });

  if (!budget) return null;

  const { start, end } = monthRange(year, month);

  const spending = await prisma.financialTransaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: "EXPENSE",
      status: "POSTED",
      transactionDate: { gte: start, lt: end },
    },
    _sum: { amount: true },
  });

  const spentByCategory = new Map<string, bigint>();
  for (const row of spending) {
    if (row.categoryId) {
      spentByCategory.set(row.categoryId, row._sum.amount ?? 0n);
    }
  }

  const items: BudgetLimitView[] = budget.categoryLimits
    .map((limit) => {
      const spent = spentByCategory.get(limit.categoryId) ?? 0n;
      return {
        categoryId: limit.categoryId,
        categoryName: limit.category.name,
        categoryType: limit.category.type,
        limit: Number(limit.limitAmount),
        spent: Number(spent),
        remaining: Number(limit.limitAmount - spent),
        share:
          limit.limitAmount > 0n ? Number(spent) / Number(limit.limitAmount) : 0,
      };
    })
    .sort((a, b) => b.share - a.share);

  const totalLimit = budget.categoryLimits.reduce(
    (sum, limit) => sum + limit.limitAmount,
    0n,
  );
  const totalSpent = budget.categoryLimits.reduce(
    (sum, limit) => sum + (spentByCategory.get(limit.categoryId) ?? 0n),
    0n,
  );

  return {
    id: budget.id,
    name: budget.name,
    year: budget.year,
    month: budget.month,
    notes: budget.notes,
    totalLimit: Number(totalLimit),
    totalSpent: Number(totalSpent),
    totalRemaining: Number(totalLimit - totalSpent),
    share: totalLimit > 0n ? Number(totalSpent) / Number(totalLimit) : 0,
    items,
  };
}

async function getBudgetOrThrow(userId: string, year: number, month: number) {
  const budget = await buildBudgetView(userId, year, month);
  if (!budget) {
    throw new ServiceError("Anggaran tidak ditemukan.", 404);
  }
  return budget;
}

export function getBudget(userId: string, year: number, month: number) {
  return buildBudgetView(userId, year, month);
}

export async function createBudget(
  userId: string,
  input: BudgetCreateInput,
): Promise<BudgetView> {
  try {
    await prisma.budget.create({
      data: {
        userId,
        name: input.name,
        year: input.year,
        month: input.month,
        notes: input.notes || null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ServiceError("Anggaran periode ini sudah ada.", 409);
    }
    throw error;
  }

  return getBudgetOrThrow(userId, input.year, input.month);
}

export async function updateBudget(
  userId: string,
  budgetId: string,
  input: BudgetUpdateInput,
): Promise<BudgetView> {
  const existing = await prisma.budget.findFirst({
    where: { id: budgetId, userId },
    select: { year: true, month: true },
  });

  if (!existing) {
    throw new ServiceError("Anggaran tidak ditemukan.", 404);
  }

  await prisma.budget.update({
    where: { id: budgetId },
    data: {
      name: input.name ?? undefined,
      notes: input.notes === undefined ? undefined : input.notes || null,
    },
  });

  return getBudgetOrThrow(userId, existing.year, existing.month);
}

export async function upsertBudgetLimit(
  userId: string,
  budgetId: string,
  input: BudgetLimitInput,
): Promise<BudgetView> {
  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, userId },
    select: { year: true, month: true },
  });

  if (!budget) {
    throw new ServiceError("Anggaran tidak ditemukan.", 404);
  }

  const category = await prisma.category.findFirst({
    where: {
      id: input.categoryId,
      userId,
      type: "EXPENSE",
      isArchived: false,
    },
    select: { id: true },
  });

  if (!category) {
    throw new ServiceError("Kategori pengeluaran tidak ditemukan.", 404);
  }

  await prisma.budgetCategoryLimit.upsert({
    where: {
      budgetId_categoryId: {
        budgetId,
        categoryId: input.categoryId,
      },
    },
    update: { limitAmount: BigInt(input.limitAmount) },
    create: {
      budgetId,
      categoryId: input.categoryId,
      limitAmount: BigInt(input.limitAmount),
    },
  });

  return getBudgetOrThrow(userId, budget.year, budget.month);
}

export async function deleteBudgetLimit(
  userId: string,
  budgetId: string,
  categoryId: string,
): Promise<BudgetView> {
  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, userId },
    select: { year: true, month: true },
  });

  if (!budget) {
    throw new ServiceError("Anggaran tidak ditemukan.", 404);
  }

  await prisma.budgetCategoryLimit.deleteMany({
    where: { budgetId, categoryId },
  });

  return getBudgetOrThrow(userId, budget.year, budget.month);
}

export async function copyBudget(
  userId: string,
  input: BudgetCopyInput,
): Promise<BudgetView> {
  if (input.fromYear === input.toYear && input.fromMonth === input.toMonth) {
    throw new ServiceError("Periode sumber dan tujuan tidak boleh sama.");
  }

  const source = await prisma.budget.findUnique({
    where: {
      userId_year_month: {
        userId,
        year: input.fromYear,
        month: input.fromMonth,
      },
    },
    include: {
      categoryLimits: {
        where: { category: { is: { isArchived: false } } },
      },
    },
  });

  if (!source) {
    throw new ServiceError("Anggaran sumber tidak ditemukan.", 404);
  }

  const target = await prisma.budget.upsert({
    where: {
      userId_year_month: {
        userId,
        year: input.toYear,
        month: input.toMonth,
      },
    },
    update: {},
    create: {
      userId,
      name: source.name,
      year: input.toYear,
      month: input.toMonth,
      notes: source.notes,
    },
  });

  if (source.categoryLimits.length > 0) {
    await prisma.$transaction(
      source.categoryLimits.map((limit) =>
        prisma.budgetCategoryLimit.upsert({
          where: {
            budgetId_categoryId: {
              budgetId: target.id,
              categoryId: limit.categoryId,
            },
          },
          update: { limitAmount: limit.limitAmount },
          create: {
            budgetId: target.id,
            categoryId: limit.categoryId,
            limitAmount: limit.limitAmount,
          },
        }),
      ),
    );
  }

  return getBudgetOrThrow(userId, input.toYear, input.toMonth);
}
