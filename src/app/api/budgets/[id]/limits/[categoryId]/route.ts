import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { deleteBudgetLimit } from "@/services/budget.service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; categoryId: string }> },
) {
  try {
    const user = await requireUser();
    const { id, categoryId } = await params;

    return NextResponse.json({
      budget: await deleteBudgetLimit(user.id, id, categoryId),
    });
  } catch (error) {
    return apiError(error);
  }
}
