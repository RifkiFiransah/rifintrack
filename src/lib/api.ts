import { NextResponse } from "next/server";
import { ServiceError } from "@/lib/service-error";

export function apiError(error: unknown) {
  if (error instanceof ServiceError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json(
    { error: "Terjadi kesalahan pada server." },
    { status: 500 },
  );
}

export async function readJson(request: Request) {
  try {
    return { ok: true as const, data: (await request.json()) as unknown };
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Body tidak valid." },
        { status: 400 },
      ),
    };
  }
}
