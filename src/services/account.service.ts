import type { Account, AccountType, LedgerDirection } from "@prisma/client";
import type { z } from "zod";
import {
  accountCreateSchema,
  accountUpdateSchema,
} from "@/lib/finance-validation";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/service-error";

type AccountCreateInput = z.infer<typeof accountCreateSchema>;
type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;

export type AccountView = {
  id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  color: string | null;
  icon: string | null;
  isArchived: boolean;
  openingDate: string;
  balance: number;
};

function toView(account: Account, balance: bigint): AccountView {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    institution: account.institution,
    color: account.color,
    icon: account.icon,
    isArchived: account.isArchived,
    openingDate: account.openingDate.toISOString().slice(0, 10),
    balance: Number(balance),
  };
}

function netByAccount(
  rows: Array<{
    accountId: string;
    direction: LedgerDirection;
    amount: bigint;
  }>,
) {
  const map = new Map<string, bigint>();

  for (const row of rows) {
    const current = map.get(row.accountId) ?? 0n;
    map.set(
      row.accountId,
      row.direction === "CREDIT" ? current + row.amount : current - row.amount,
    );
  }

  return map;
}

export async function listAccounts(userId: string): Promise<AccountView[]> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: [{ isArchived: "asc" }, { createdAt: "asc" }],
  });

  if (accounts.length === 0) return [];

  const sums = await prisma.ledgerEntry.groupBy({
    by: ["accountId", "direction"],
    where: { accountId: { in: accounts.map((account) => account.id) } },
    _sum: { amount: true },
  });

  const net = netByAccount(
    sums.map((row) => ({
      accountId: row.accountId,
      direction: row.direction,
      amount: row._sum.amount ?? 0n,
    })),
  );

  return accounts.map((account) =>
    toView(account, account.openingBalance + (net.get(account.id) ?? 0n)),
  );
}

export async function getAccountBalance(userId: string, accountId: string) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });

  if (!account) {
    throw new ServiceError("Rekening tidak ditemukan.", 404);
  }

  const sums = await prisma.ledgerEntry.groupBy({
    by: ["direction"],
    where: { accountId },
    _sum: { amount: true },
  });

  let net = 0n;
  for (const row of sums) {
    const amount = row._sum.amount ?? 0n;
    net += row.direction === "CREDIT" ? amount : -amount;
  }

  return account.openingBalance + net;
}

export async function createAccount(
  userId: string,
  input: AccountCreateInput,
): Promise<AccountView> {
  const openingDate = input.openingDate ?? new Date();
  const openingAmount = BigInt(input.openingBalance);

  return prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        userId,
        name: input.name,
        type: input.type,
        institution: input.institution || null,
        openingBalance: 0n,
        openingDate,
        color: input.color || null,
        icon: input.icon || null,
      },
    });

    if (openingAmount > 0n) {
      const openingTransaction = await tx.financialTransaction.create({
        data: {
          userId,
          accountId: account.id,
          type: "OPENING_BALANCE",
          status: "POSTED",
          amount: openingAmount,
          transactionDate: openingDate,
          description: "Saldo awal",
          postedAt: new Date(),
        },
      });

      await tx.ledgerEntry.create({
        data: {
          transactionId: openingTransaction.id,
          accountId: account.id,
          direction: "CREDIT",
          amount: openingAmount,
        },
      });
    }

    return toView(account, openingAmount);
  });
}

export async function updateAccount(
  userId: string,
  accountId: string,
  input: AccountUpdateInput,
) {
  const existing = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });

  if (!existing) {
    throw new ServiceError("Rekening tidak ditemukan.", 404);
  }

  await prisma.account.update({
    where: { id: accountId },
    data: {
      name: input.name ?? undefined,
      type: input.type ?? undefined,
      institution:
        input.institution === undefined ? undefined : input.institution || null,
      color: input.color === undefined ? undefined : input.color || null,
      icon: input.icon === undefined ? undefined : input.icon || null,
      isArchived: input.isArchived ?? undefined,
    },
  });

  if (input.isArchived === true) {
    await prisma.recurringRule.updateMany({
      where: {
        userId,
        isActive: true,
        OR: [
          { accountId },
          { sourceAccountId: accountId },
          { destinationAccountId: accountId },
        ],
      },
      data: { isActive: false },
    });
  }

  return { id: accountId };
}
