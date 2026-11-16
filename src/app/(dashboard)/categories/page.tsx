import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CategoryManager } from "@/features/categories/category-manager";
import { getSession } from "@/lib/auth";
import { listCategories } from "@/services/category.service";

export const metadata: Metadata = {
  title: "Kategori",
};

export default async function CategoriesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const categories = await listCategories(session.user.id, true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Kategori</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Kelompokkan pemasukan dan pengeluaranmu.
        </p>
      </div>

      <CategoryManager categories={categories} />
    </div>
  );
}
