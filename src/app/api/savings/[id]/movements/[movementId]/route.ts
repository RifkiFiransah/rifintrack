import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { deleteGoalMovement } from "@/services/savings.service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; movementId: string }> },
) {
  try {
    const user = await requireUser();
    const { id, movementId } = await params;

    return NextResponse.json({
      goal: await deleteGoalMovement(user.id, id, movementId),
    });
  } catch (error) {
    return apiError(error);
  }
}
