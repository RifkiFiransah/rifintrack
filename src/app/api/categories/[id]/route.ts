import { NextResponse } from "next/server";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { categoryUpdateSchema } from "@/lib/finance-validation";
import { updateCategory } from "@/services/category.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request);
    if (!body.ok) return body.response;

    const parsed = categoryUpdateSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
        { status: 400 },
      );
    }

    const category = await updateCategory(user.id, id, parsed.data);
    return NextResponse.json({ category });
  } catch (error) {
    return apiError(error);
  }
}
