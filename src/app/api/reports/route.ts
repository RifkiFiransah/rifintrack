import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getReportData, resolveReportInput } from "@/services/report.service";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const searchParams = new URL(request.url).searchParams;
    const { period, anchor } = resolveReportInput(
      searchParams.get("period"),
      searchParams.get("date"),
    );

    return NextResponse.json({
      report: await getReportData(user.id, period, anchor),
    });
  } catch (error) {
    return apiError(error);
  }
}
