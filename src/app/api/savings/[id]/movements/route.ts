import { NextResponse } from "next/server";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { savingsMovementSchema } from "@/lib/finance-validation";
import { addGoalMovement } from "@/services/savings.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request);
    if (!body.ok) return body.response;

    const parsed = savingsMovementSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      goal: await addGoalMovement(user.id, id, parsed.data),
    });
  } catch (error) {
    return apiError(error);
  }
}
