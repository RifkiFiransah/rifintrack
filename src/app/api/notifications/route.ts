import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { listNotifications } from "@/services/notification.service";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(await listNotifications(user.id));
  } catch (error) {
    return apiError(error);
  }
}
