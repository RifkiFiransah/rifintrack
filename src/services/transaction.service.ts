import {
  Prisma,
  type CategoryType,
  type LedgerDirection,
  type TransactionStatus,
  type TransactionType,
} from "@prisma/client";
import type { z } from "zod";
import { transactionCreateSchema } from "@/lib/finance-validation";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/service-error";

type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
type TransactionUpdateInput = z.infer<typeof transactionCreateSchema>;

const transactionInclude = {
  category: { select: { id: true, name: true, type: true } },
  account: { select: { id: true, name: true } },
  sourceAccount: { select: { id: true, name: true } },
  destinationAccount: { select: { id: true, name: true } },
} satisfies Prisma.FinancialTransactionInclude;

type TransactionRecord = Prisma.FinancialTransactionGetPayload<{
  include: typeof transactionInclude;
}>;

export type TransactionView = {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  transactionDate: string;
  description: string | null;
  notes: string | null;
  categoryId: string | null;
  accountId: string | null;
  sourceAccountId: string | null;
  destinationAccountId: string | null;
  category: { id: string; name: string; type: CategoryType } | null;
  account: { id: string; name: string } | null;
  sourceAccount: { id: string; name: string } | null;
  destinationAccount: { id: string; name: string } | null;
  createdAt: string;
};

function toView(record: TransactionRecord): TransactionView {
  return {
    id: record.id,
    type: record.type,
    status: record.status,
    amount: Number(record.amount),
    transactionDate: record.transactionDate.toISOString().slice(0, 10),
    description: record.description,
    notes: record.notes,
    categoryId: record.categoryId,
    accountId: record.accountId,
    sourceAccountId: record.sourceAccountId,
    destinationAccountId: record.destinationAccountId,
    category: record.category,
    account: record.account,
    sourceAccount: record.sourceAccount,
    destinationAccount: record.destinationAccount,
    createdAt: record.createdAt.toISOString(),
  };
}

export type TransactionFilters = {
  type?: TransactionType;
  categoryId?: string;
  accountId?: string;
  from?: Date;
  to?: Date;
  search?: string;
  take?: number;
};

export async function listTransactions(
  userId: string,
  filters: TransactionFilters = {},
): Promise<TransactionView[]> {
  const conditions: Prisma.FinancialTransactionWhereInput[] = [{ userId }];

  if (filters.type) {
    conditions.push({ type: filters.type });
  }
  if (filters.categoryId) {
    conditions.push({ categoryId: filters.categoryId });
  }
  if (filters.accountId) {
    conditions.push({
      OR: [
        { accountId: filters.accountId },
        { sourceAccountId: filters.accountId },
        { destinationAccountId: filters.accountId },
      ],
    });
  }
  if (filters.from || filters.to) {
    conditions.push({
      transactionDate: {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      },
    });
  }
  if (filters.search) {
    conditions.push({
      OR: [
        { description: { contains: filters.search, mode: "insensitive" } },
        { notes: { contains: filters.search, mode: "insensitive" } },
      ],
    });
  }

  const records = await prisma.financialTransaction.findMany({
    where: { AND: conditions },
    include: transactionInclude,
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    take: filters.take ?? 200,
  });

  return records.map(toView);
}

type LedgerDraft = {
  accountId: string;
  direction: LedgerDirection;
  amount: bigint;
};

async function assertAccount(
  tx: Prisma.TransactionClient,
  userId: string,
  accountId: string,
) {
  const account = await tx.account.findFirst({
    where: { id: accountId, userId, isArchived: false },
  });

  if (!account) {
    throw new ServiceError("Rekening tidak ditemukan.", 404);
  }

  return account;
}

async function assertCategory(
  tx: Prisma.TransactionClient,
  userId: string,
  categoryId: string,
  type: "INCOME" | "EXPENSE",
) {
  const category = await tx.category.findFirst({
    where: { id: categoryId, userId, isArchived: false },
  });

  if (!category) {
    throw new ServiceError("Kategori tidak ditemukan.", 404);
  }
  if (category.type !== type) {
    throw new ServiceError("Kategori tidak sesuai dengan tipe transaksi.");
  }

  return category;
}

async function resolveLedger(
  tx: Prisma.TransactionClient,
  userId: string,
  input: TransactionCreateInput,
): Promise<LedgerDraft[]> {
  const amount = BigInt(input.amount);

  if (input.type === "TRANSFER") {
    if (!input.sourceAccountId || !input.destinationAccountId) {
      throw new ServiceError("Rekening sumber dan tujuan wajib diisi.");
    }
    if (input.sourceAccountId === input.destinationAccountId) {
      throw new ServiceError("Rekening sumber dan tujuan tidak boleh sama.");
    }

    await assertAccount(tx, userId, input.sourceAccountId);
    await assertAccount(tx, userId, input.destinationAccountId);

    return [
      {
        accountId: input.sourceAccountId,
        direction: "DEBIT",
        amount,
      },
      {
        accountId: input.destinationAccountId,
        direction: "CREDIT",
        amount,
      },
    ];
  }

  if (!input.accountId) {
    throw new ServiceError("Rekening wajib diisi.");
  }
  if (!input.categoryId) {
    throw new ServiceError("Kategori wajib diisi.");
  }

  await assertAccount(tx, userId, input.accountId);
  await assertCategory(tx, userId, input.categoryId, input.type);

  return [
    {
      accountId: input.accountId,
      direction: input.type === "INCOME" ? "CREDIT" : "DEBIT",
      amount,
    },
  ];
}

function writeData(
  input: TransactionCreateInput,
): Omit<Prisma.FinancialTransactionUncheckedCreateInput, "userId"> {
  const isTransfer = input.type === "TRANSFER";

  return {
    type: input.type,
    status: "POSTED",
    amount: BigInt(input.amount),
    transactionDate: input.transactionDate,
    categoryId: isTransfer ? null : input.categoryId ?? null,
    accountId: isTransfer ? null : input.accountId ?? null,
    sourceAccountId: isTransfer ? input.sourceAccountId ?? null : null,
    destinationAccountId: isTransfer ? input.destinationAccountId ?? null : null,
    description: input.description || null,
    notes: input.notes || null,
  };
}

export async function createTransaction(
  userId: string,
  input: TransactionCreateInput,
): Promise<TransactionView> {
  return prisma.$transaction(async (tx) => {
    if (input.idempotencyKey) {
      const existing = await tx.financialTransaction.findFirst({
        where: { userId, idempotencyKey: input.idempotencyKey },
        include: transactionInclude,
      });

      if (existing) {
        return toView(existing);
      }
    }

    const ledger = await resolveLedger(tx, userId, input);

    const record = await tx.financialTransaction.create({
      data: {
        ...writeData(input),
        userId,
        idempotencyKey: input.idempotencyKey ?? null,
        postedAt: new Date(),
      },
      include: transactionInclude,
    });

    await tx.ledgerEntry.createMany({
      data: ledger.map((entry) => ({
        transactionId: record.id,
        ...entry,
      })),
    });

    return toView(record);
  });
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: TransactionUpdateInput,
): Promise<TransactionView> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.financialTransaction.findFirst({
      where: { id: transactionId, userId },
    });

    if (!existing) {
      throw new ServiceError("Transaksi tidak ditemukan.", 404);
    }
    if (existing.status === "VOIDED") {
      throw new ServiceError("Transaksi sudah dibatalkan.");
    }
    if (existing.type === "OPENING_BALANCE") {
      throw new ServiceError("Transaksi saldo awal tidak dapat diubah.");
    }

    const ledger = await resolveLedger(tx, userId, input);

    await tx.ledgerEntry.deleteMany({ where: { transactionId } });

    const record = await tx.financialTransaction.update({
      where: { id: transactionId },
      data: writeData(input),
      include: transactionInclude,
    });

    await tx.ledgerEntry.createMany({
      data: ledger.map((entry) => ({
        transactionId: record.id,
        ...entry,
      })),
    });

    return toView(record);
  });
}

export async function voidTransaction(
  userId: string,
  transactionId: string,
): Promise<TransactionView> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.financialTransaction.findFirst({
      where: { id: transactionId, userId },
      include: { ledgerEntries: true },
    });

    if (!existing) {
      throw new ServiceError("Transaksi tidak ditemukan.", 404);
    }
    if (existing.status === "VOIDED") {
      throw new ServiceError("Transaksi sudah dibatalkan.");
    }
    if (existing.type === "OPENING_BALANCE") {
      throw new ServiceError("Transaksi saldo awal tidak dapat dibatalkan.");
    }

    if (existing.ledgerEntries.length > 0) {
      await tx.ledgerEntry.createMany({
        data: existing.ledgerEntries.map((entry) => ({
          transactionId: existing.id,
          accountId: entry.accountId,
          direction: entry.direction === "DEBIT" ? "CREDIT" : "DEBIT",
          amount: entry.amount,
        })),
      });
    }

    const record = await tx.financialTransaction.update({
      where: { id: transactionId },
      data: { status: "VOIDED", voidedAt: new Date() },
      include: transactionInclude,
    });

    return toView(record);
  });
}
