import { PrismaClient, AccountType, CategoryType } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;
  const fullName = process.env.SEED_USER_NAME ?? "Development User";

  if (!email || !password) {
    throw new Error("SEED_USER_EMAIL and SEED_USER_PASSWORD are required");
  }

  const passwordHash = await hash(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { fullName, email, passwordHash },
  });

  async function ensureCategory(name: string, type: CategoryType) {
    let category = await prisma.category.findFirst({
      where: { userId: user.id, name, type },
    });

    if (!category) {
      category = await prisma.category.create({
        data: { userId: user.id, name, type, isDefault: true },
      });
    }

    return category.id;
  }

  const expenseCategoryNames = [
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
  ];

  const incomeCategoryNames = ["Gaji", "Freelance", "Bonus", "Investasi", "Lainnya"];

  const expenseCategoryIds = new Map<string, string>();

  for (const name of expenseCategoryNames) {
    expenseCategoryIds.set(name, await ensureCategory(name, CategoryType.EXPENSE));
  }

  for (const name of incomeCategoryNames) {
    await ensureCategory(name, CategoryType.INCOME);
  }

  const accounts = [
    { name: "BNI", type: AccountType.BANK },
    { name: "SeaBank", type: AccountType.BANK },
    { name: "DANA", type: AccountType.E_WALLET },
    { name: "Tunai", type: AccountType.CASH },
  ];

  for (const account of accounts) {
    const existing = await prisma.account.findFirst({
      where: { userId: user.id, name: account.name },
    });

    if (!existing) {
      await prisma.account.create({
        data: {
          userId: user.id,
          name: account.name,
          type: account.type,
          openingBalance: 0n,
          openingDate: new Date(),
        },
      });
    }
  }

  const budgetItems: Array<[string, bigint]> = [
    ["Kosan", 1_250_000n],
    ["Orang Tua", 1_000_000n],
    ["Makanan", 1_200_000n],
    ["Transportasi", 200_000n],
    ["Shopee", 200_000n],
    ["Internet", 100_000n],
    ["Kebutuhan Kos", 150_000n],
    ["Potong Rambut", 50_000n],
    ["Donasi", 50_000n],
    ["Hiburan", 100_000n],
    ["Lainnya", 100_000n],
  ];

  const now = new Date();

  await prisma.budget.upsert({
    where: {
      userId_year_month: {
        userId: user.id,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      },
    },
    update: {},
    create: {
      userId: user.id,
      name: "Anggaran Bulanan",
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      categoryLimits: {
        create: budgetItems.map(([name, amount]) => ({
          categoryId: expenseCategoryIds.get(name)!,
          limitAmount: amount,
        })),
      },
    },
  });

  console.log("RiFinTrack development seed completed.");
  console.log(`Development user: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
