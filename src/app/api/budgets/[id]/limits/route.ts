import { NextResponse } from "next/server";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { budgetLimitSchema } from "@/lib/finance-validation";
import { upsertBudgetLimit } from "@/services/budget.service";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request);
    if (!body.ok) return body.response;

    const parsed = budgetLimitSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      budget: await upsertBudgetLimit(user.id, id, parsed.data),
    });
  } catch (error) {
    return apiError(error);
  }
}
