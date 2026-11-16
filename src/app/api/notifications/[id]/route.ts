import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { markNotificationRead } from "@/services/notification.service";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await markNotificationRead(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
