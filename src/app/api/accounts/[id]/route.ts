import { NextResponse } from "next/server";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { accountUpdateSchema } from "@/lib/finance-validation";
import { updateAccount } from "@/services/account.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request);
    if (!body.ok) return body.response;

    const parsed = accountUpdateSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
        { status: 400 },
      );
    }

    const account = await updateAccount(user.id, id, parsed.data);
    return NextResponse.json({ account });
  } catch (error) {
    return apiError(error);
  }
}
