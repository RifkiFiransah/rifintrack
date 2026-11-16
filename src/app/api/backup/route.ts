import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { exportBackup, restoreBackup } from "@/services/backup.service";

export async function GET() {
  try {
    const user = await requireUser();
    const backup = await exportBackup(user.id);
    const filename = `rifintrack-backup-${backup.exportedAt.slice(0, 10)}.json`;

    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson(request);
    if (!body.ok) return body.response;

    const counts = await restoreBackup(user.id, body.data);
    return new Response(JSON.stringify({ restored: counts }), {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error) {
    return apiError(error);
  }
}
