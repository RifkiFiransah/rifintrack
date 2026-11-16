import { NextResponse } from "next/server";
import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { categoryCreateSchema } from "@/lib/finance-validation";
import { createCategory, listCategories } from "@/services/category.service";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const includeArchived =
      new URL(request.url).searchParams.get("includeArchived") === "true";
    return NextResponse.json({
      categories: await listCategories(user.id, includeArchived),
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

    const parsed = categoryCreateSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
        { status: 400 },
      );
    }

    const category = await createCategory(user.id, parsed.data);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
