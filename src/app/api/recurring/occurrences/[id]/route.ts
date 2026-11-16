import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import {
  postRecurringOccurrence,
  skipRecurringOccurrence,
} from "@/services/recurring.service";

const actionSchema = z.object({ action: z.enum(["post", "skip"]) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(request);
    if (!body.ok) return body.response;

    const parsed = actionSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Aksi tidak valid." },
        { status: 400 },
      );
    }

    const rule =
      parsed.data.action === "post"
        ? await postRecurringOccurrence(user.id, id)
        : await skipRecurringOccurrence(user.id, id);

    return NextResponse.json({ rule });
  } catch (error) {
    return apiError(error);
  }
}
