import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getFinancialInsight } from "@/services/insight.service";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ insight: await getFinancialInsight(user.id) });
  } catch (error) {
    return apiError(error);
  }
}
