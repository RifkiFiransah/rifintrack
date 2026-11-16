import { NextResponse } from "next/server";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { accountCreateSchema } from "@/lib/finance-validation";
import { createAccount, listAccounts } from "@/services/account.service";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ accounts: await listAccounts(user.id) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJson(request);
    if (!body.ok) return body.response;

    const parsed = accountCreateSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
        { status: 400 },
      );
    }

    const account = await createAccount(user.id, parsed.data);
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
