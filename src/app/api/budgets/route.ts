import { NextResponse } from "next/server";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { budgetCreateSchema } from "@/lib/finance-validation";
import { createBudget, getBudget } from "@/services/budget.service";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const searchParams = new URL(request.url).searchParams;
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      year < 2020 ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        { error: "Parameter year dan month tidak valid." },
        { status: 400 },
      );
    }

    return NextResponse.json({ budget: await getBudget(user.id, year, month) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson(request);
    if (!body.ok) return body.response;

    const parsed = budgetCreateSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
        { status: 400 },
      );
    }

    const budget = await createBudget(user.id, parsed.data);
    return NextResponse.json({ budget }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
