import { NextResponse } from "next/server";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { isSameOrigin } from "@/lib/http";
import { profileUpdateSchema } from "@/lib/validation";
import { updateProfile } from "@/services/profile.service";

export async function PATCH(request: Request) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Origin tidak valid." }, { status: 403 });
    }

    const user = await requireUser();
    const body = await readJson(request);
    if (!body.ok) return body.response;

    const parsed = profileUpdateSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
        { status: 400 },
      );
    }

    const updated = await updateProfile(user.id, parsed.data);
    return NextResponse.json({ user: updated });
  } catch (error) {
    return apiError(error);
  }
}
