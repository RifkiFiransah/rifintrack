import { NextResponse } from "next/server";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { savingsGoalUpdateSchema } from "@/lib/finance-validation";
import { updateSavingsGoal } from "@/services/savings.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request);
    if (!body.ok) return body.response;

    const parsed = savingsGoalUpdateSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      goal: await updateSavingsGoal(user.id, id, parsed.data),
    });
  } catch (error) {
    return apiError(error);
  }
}
