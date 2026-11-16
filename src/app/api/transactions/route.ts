import type { TransactionType } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { transactionCreateSchema } from "@/lib/finance-validation";
import {
  createTransaction,
  listTransactions,
  type TransactionFilters,
} from "@/services/transaction.service";

const TYPES: TransactionType[] = ["INCOME", "EXPENSE", "TRANSFER"];

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const searchParams = new URL(request.url).searchParams;
    const filters: TransactionFilters = {};

    const type = searchParams.get("type");
    if (type && TYPES.includes(type as TransactionType)) {
      filters.type = type as TransactionType;
    }

    const categoryId = searchParams.get("categoryId");
    if (categoryId) filters.categoryId = categoryId;

    const accountId = searchParams.get("accountId");
    if (accountId) filters.accountId = accountId;

    const from = searchParams.get("from");
    if (from) filters.from = new Date(from);

    const to = searchParams.get("to");
    if (to) filters.to = new Date(to);

    const search = searchParams.get("q");
    if (search) filters.search = search;

    const take = searchParams.get("take");
    if (take) filters.take = Math.min(Math.max(Number(take) || 0, 1), 200);

    return NextResponse.json({
      transactions: await listTransactions(user.id, filters),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson(request);
    if (!body.ok) return body.response;

    const parsed = transactionCreateSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
        { status: 400 },
      );
    }

    const transaction = await createTransaction(user.id, parsed.data);
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
