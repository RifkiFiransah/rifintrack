import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { markAllNotificationsRead } from "@/services/notification.service";

export async function POST() {
  try {
    const user = await requireUser();
    await markAllNotificationsRead(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
