import { apiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { buildReportExcel, buildReportPdf } from "@/lib/report-export";
import { ServiceError } from "@/lib/service-error";
import {
  getReportCsv,
  getReportData,
  resolveReportInput,
} from "@/services/report.service";

export const runtime = "nodejs";

const EXPORT_FORMATS = ["csv", "pdf", "xlsx", "excel"] as const;
type ExportFormat = (typeof EXPORT_FORMATS)[number];

function resolveFormat(value: string | null): ExportFormat {
  const format = (value ?? "csv").toLowerCase();
  if (!EXPORT_FORMATS.includes(format as ExportFormat)) {
    throw new ServiceError("Format export tidak didukung.", 400);
  }
  return format as ExportFormat;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const searchParams = new URL(request.url).searchParams;
    const format = resolveFormat(searchParams.get("format"));
    const { period, anchor } = resolveReportInput(
      searchParams.get("period"),
      searchParams.get("date"),
    );
    const baseName = `rifintrack-${period.toLowerCase()}-${anchor
      .toISOString()
      .slice(0, 10)}`;

    if (format === "csv") {
      const { filename, csv } = await getReportCsv(user.id, period, anchor);
      return new Response(`\uFEFF${csv}`, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const report = await getReportData(user.id, period, anchor, 1000);

    if (format === "pdf") {
      const pdf = await buildReportPdf(report);
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const workbook = await buildReportExcel(report);
    return new Response(new Uint8Array(workbook), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
