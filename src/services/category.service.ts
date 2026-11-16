import type { Category, CategoryType } from "@prisma/client";
import type { z } from "zod";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
} from "@/lib/finance-validation";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/service-error";

type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

export type CategoryView = {
  id: string;
  name: string;
  type: CategoryType;
  parentId: string | null;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  isArchived: boolean;
};

function toView(category: Category): CategoryView {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    parentId: category.parentId,
    icon: category.icon,
    color: category.color,
    isDefault: category.isDefault,
    isArchived: category.isArchived,
  };
}

export async function listCategories(
  userId: string,
  includeArchived = false,
): Promise<CategoryView[]> {
  const categories = await prisma.category.findMany({
    where: {
      userId,
      ...(includeArchived ? {} : { isArchived: false }),
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return categories.map(toView);
}

export async function createCategory(
  userId: string,
  input: CategoryCreateInput,
): Promise<CategoryView> {
  if (input.parentId) {
    const parent = await prisma.category.findFirst({
      where: { id: input.parentId, userId },
    });

    if (!parent) {
      throw new ServiceError("Kategori induk tidak ditemukan.", 404);
    }
    if (parent.type !== input.type) {
      throw new ServiceError("Tipe kategori induk tidak sesuai.");
    }
    if (parent.parentId) {
      throw new ServiceError("Subkategori tidak dapat memiliki subkategori.");
    }
  }

  const category = await prisma.category.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      parentId: input.parentId ?? null,
      icon: input.icon || null,
      color: input.color || null,
    },
  });

  return toView(category);
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  input: CategoryUpdateInput,
): Promise<CategoryView> {
  const existing = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });

  if (!existing) {
    throw new ServiceError("Kategori tidak ditemukan.", 404);
  }

  const category = await prisma.category.update({
    where: { id: categoryId },
    data: {
      name: input.name ?? undefined,
      icon: input.icon === undefined ? undefined : input.icon || null,
      color: input.color === undefined ? undefined : input.color || null,
      isArchived: input.isArchived ?? undefined,
    },
  });

  if (input.isArchived === true) {
    await prisma.recurringRule.updateMany({
      where: { userId, categoryId, isActive: true },
      data: { isActive: false },
    });
  }

  return toView(category);
}
