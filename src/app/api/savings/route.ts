import { NextResponse } from "next/server";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { savingsGoalCreateSchema } from "@/lib/finance-validation";
import { createSavingsGoal, listSavings } from "@/services/savings.service";

export async function GET() {
  try {
    const user = await requireUser();
    const { goals, summary } = await listSavings(user.id);
    return NextResponse.json({ goals, summary });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson(request);
    if (!body.ok) return body.response;

    const parsed = savingsGoalCreateSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
        { status: 400 },
      );
    }

    const goal = await createSavingsGoal(user.id, parsed.data);
    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
