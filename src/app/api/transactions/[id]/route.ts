import { NextResponse } from "next/server";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { transactionCreateSchema } from "@/lib/finance-validation";
import {
  updateTransaction,
  voidTransaction,
} from "@/services/transaction.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request);
    if (!body.ok) return body.response;

    const parsed = transactionCreateSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
        { status: 400 },
      );
    }

    const transaction = await updateTransaction(user.id, id, parsed.data);
    return NextResponse.json({ transaction });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const transaction = await voidTransaction(user.id, id);
    return NextResponse.json({ transaction });
  } catch (error) {
    return apiError(error);
  }
}
