export type DefaultCategoryType = "INCOME" | "EXPENSE";

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Kosan",
  "Orang Tua",
  "Makanan",
  "Transportasi",
  "Shopee",
  "Internet",
  "Kebutuhan Kos",
  "Potong Rambut",
  "Donasi",
  "Hiburan",
  "Lainnya",
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  "Gaji",
  "Freelance",
  "Bonus",
  "Investasi",
  "Lainnya",
] as const;

export const DEFAULT_CATEGORIES: Array<{
  name: string;
  type: DefaultCategoryType;
}> = [
  ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
    name,
    type: "EXPENSE" as const,
  })),
  ...DEFAULT_INCOME_CATEGORIES.map((name) => ({
    name,
    type: "INCOME" as const,
  })),
];
