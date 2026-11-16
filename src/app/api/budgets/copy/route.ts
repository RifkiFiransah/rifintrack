import { NextResponse } from "next/server";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { budgetCopySchema } from "@/lib/finance-validation";
import { copyBudget } from "@/services/budget.service";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson(request);
    if (!body.ok) return body.response;

    const parsed = budgetCopySchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      budget: await copyBudget(user.id, parsed.data),
    });
  } catch (error) {
    return apiError(error);
  }
}
