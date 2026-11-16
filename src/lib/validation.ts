import { z } from "zod";

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(120, "Nama maksimal 120 karakter"),
  email: z
    .email("Email tidak valid")
    .max(255, "Email maksimal 255 karakter")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(128, "Password maksimal 128 karakter"),
});

export const loginSchema = z.object({
  email: z
    .email("Email tidak valid")
    .max(255, "Email maksimal 255 karakter")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Password wajib diisi").max(128),
});

export const profileUpdateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(120, "Nama maksimal 120 karakter"),
  email: z
    .email("Email tidak valid")
    .max(255, "Email maksimal 255 karakter")
    .transform((value) => value.toLowerCase()),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Password saat ini wajib diisi")
      .max(128),
    newPassword: z
      .string()
      .min(8, "Password baru minimal 8 karakter")
      .max(128, "Password baru maksimal 128 karakter"),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Password baru harus berbeda dari password saat ini.",
    path: ["newPassword"],
  });

