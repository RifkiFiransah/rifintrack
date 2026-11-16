import { z } from "zod";

const maxAmount = Number.MAX_SAFE_INTEGER;

export const accountCreateSchema = z.object({
  name: z.string().trim().min(1, "Nama rekening wajib diisi").max(100),
  type: z.enum(["BANK", "E_WALLET", "CASH", "OTHER"]),
  institution: z.string().trim().max(100).optional(),
  openingBalance: z.coerce.number().int().min(0, "Saldo awal tidak boleh negatif").max(maxAmount).default(0),
  openingDate: z.coerce.date().optional(),
  color: z.string().trim().max(20).optional(),
  icon: z.string().trim().max(50).optional(),
});

export const accountUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  type: z.enum(["BANK", "E_WALLET", "CASH", "OTHER"]).optional(),
  institution: z.string().trim().max(100).optional(),
  color: z.string().trim().max(20).optional(),
  icon: z.string().trim().max(50).optional(),
  isArchived: z.boolean().optional(),
});

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Nama kategori wajib diisi").max(80),
  type: z.enum(["INCOME", "EXPENSE"]),
  parentId: z.uuid().optional().nullable(),
  icon: z.string().trim().max(50).optional(),
  color: z.string().trim().max(20).optional(),
});

export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  icon: z.string().trim().max(50).optional(),
  color: z.string().trim().max(20).optional(),
  isArchived: z.boolean().optional(),
});

export const transactionCreateSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  amount: z.coerce.number().int().positive("Nominal harus lebih dari 0").max(maxAmount),
  transactionDate: z.coerce.date(),
  categoryId: z.uuid().optional().nullable(),
  accountId: z.uuid().optional().nullable(),
  sourceAccountId: z.uuid().optional().nullable(),
  destinationAccountId: z.uuid().optional().nullable(),
  description: z.string().trim().max(255).optional(),
  notes: z.string().trim().max(5000).optional(),
  idempotencyKey: z.string().trim().max(100).optional(),
});

const yearSchema = z.coerce.number().int().min(2020).max(2100);
const monthSchema = z.coerce.number().int().min(1).max(12);

export const budgetCreateSchema = z.object({
  name: z.string().trim().min(1, "Nama anggaran wajib diisi").max(100),
  year: yearSchema,
  month: monthSchema,
  notes: z.string().trim().max(2000).optional(),
});

export const budgetUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const budgetLimitSchema = z.object({
  categoryId: z.uuid(),
  limitAmount: z.coerce.number().int().min(0).max(maxAmount),
});

export const budgetCopySchema = z.object({
  fromYear: yearSchema,
  fromMonth: monthSchema,
  toYear: yearSchema,
  toMonth: monthSchema,
});

export const savingsGoalCreateSchema = z.object({
  name: z.string().trim().min(1, "Nama tujuan wajib diisi").max(100),
  type: z.enum([
    "EMERGENCY_FUND",
    "PERSONAL_SAVINGS",
    "PURCHASE",
    "TRAVEL",
    "OTHER",
  ]),
  targetAmount: z.coerce
    .number()
    .int()
    .positive("Target harus lebih dari 0")
    .max(maxAmount),
  targetDate: z.coerce.date().optional(),
  description: z.string().trim().max(2000).optional(),
  color: z.string().trim().max(20).optional(),
});

export const savingsGoalUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  targetDate: z.coerce.date().optional().nullable(),
  description: z.string().trim().max(2000).optional(),
  color: z.string().trim().max(20).optional(),
  isCompleted: z.boolean().optional(),
});

export const savingsMovementSchema = z.object({
  type: z.enum(["CONTRIBUTION", "WITHDRAWAL"]),
  amount: z.coerce.number().int().positive("Nominal harus lebih dari 0").max(maxAmount),
  movementDate: z.coerce.date(),
  notes: z.string().trim().max(255).optional(),
});

export const recurringRuleCreateSchema = z
  .object({
    name: z.string().trim().min(1, "Nama transaksi rutin wajib diisi").max(100),
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
    amount: z.coerce
      .number()
      .int()
      .positive("Nominal harus lebih dari 0")
      .max(maxAmount),
    frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
    interval: z.coerce.number().int().min(1).max(365).default(1),
    dayOfMonth: z.coerce.number().int().min(1).max(31).optional().nullable(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional().nullable(),
    accountId: z.uuid().optional().nullable(),
    categoryId: z.uuid().optional().nullable(),
    sourceAccountId: z.uuid().optional().nullable(),
    destinationAccountId: z.uuid().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({
        code: "custom",
        message: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
        path: ["endDate"],
      });
    }

    if (value.frequency === "MONTHLY" && !value.dayOfMonth) {
      ctx.addIssue({
        code: "custom",
        message: "Tanggal jatuh tempo bulanan wajib diisi.",
        path: ["dayOfMonth"],
      });
    }

    if (value.type === "TRANSFER") {
      if (!value.sourceAccountId || !value.destinationAccountId) {
        ctx.addIssue({
          code: "custom",
          message: "Rekening sumber dan tujuan wajib diisi.",
          path: ["sourceAccountId"],
        });
      }
      if (
        value.sourceAccountId &&
        value.sourceAccountId === value.destinationAccountId
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Rekening sumber dan tujuan tidak boleh sama.",
          path: ["destinationAccountId"],
        });
      }
      if (value.accountId || value.categoryId) {
        ctx.addIssue({
          code: "custom",
          message: "Transfer tidak memakai rekening atau kategori tunggal.",
          path: ["accountId"],
        });
      }
    } else {
      if (!value.accountId) {
        ctx.addIssue({
          code: "custom",
          message: "Rekening wajib diisi.",
          path: ["accountId"],
        });
      }
      if (!value.categoryId) {
        ctx.addIssue({
          code: "custom",
          message: "Kategori wajib diisi.",
          path: ["categoryId"],
        });
      }
      if (value.sourceAccountId || value.destinationAccountId) {
        ctx.addIssue({
          code: "custom",
          message: "Transaksi non-transfer tidak memakai rekening sumber/tujuan.",
          path: ["sourceAccountId"],
        });
      }
    }
  });

export const recurringRuleUpdateSchema = z.object({
  isActive: z.boolean(),
});

export const notificationUpdateSchema = z.object({
  read: z.boolean().optional(),
});

