import { NextResponse } from "next/server";
import { apiError, readJson } from "@/lib/api";
import { requireUser, revokeOtherSessions } from "@/lib/auth";
import { isSameOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { passwordChangeSchema } from "@/lib/validation";
import { changePassword } from "@/services/profile.service";

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Origin tidak valid." }, { status: 403 });
    }

    const user = await requireUser();

    const limit = rateLimit(`profile-password:${user.id}`);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi nanti." },
        { status: 429 },
      );
    }

    const body = await readJson(request);
    if (!body.ok) return body.response;

    const parsed = passwordChangeSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
        { status: 400 },
      );
    }

    await changePassword(user.id, parsed.data);
    await revokeOtherSessions(user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
