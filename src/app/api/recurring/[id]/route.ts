import { NextResponse } from "next/server";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { recurringRuleUpdateSchema } from "@/lib/finance-validation";
import { setRecurringRuleActive } from "@/services/recurring.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request);
    if (!body.ok) return body.response;

    const parsed = recurringRuleUpdateSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
        { status: 400 },
      );
    }

    const rule = await setRecurringRuleActive(user.id, id, parsed.data.isActive);
    return NextResponse.json({ rule });
  } catch (error) {
    return apiError(error);
  }
}
