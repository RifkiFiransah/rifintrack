import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  passwordChangeSchema,
  profileUpdateSchema,
} from "@/lib/validation";
import { ServiceError } from "@/lib/service-error";

type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export type ProfileUser = {
  id: string;
  fullName: string;
  email: string;
};

export async function updateProfile(
  userId: string,
  input: ProfileUpdateInput,
): Promise<ProfileUser> {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: input.fullName,
        email: input.email,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    return user;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ServiceError("Email sudah digunakan akun lain.", 409);
    }

    throw error;
  }
}

export async function changePassword(
  userId: string,
  input: PasswordChangeInput,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) {
    throw new ServiceError("Akun tidak ditemukan.", 404);
  }

  const valid = await verifyPassword(user.passwordHash, input.currentPassword);
  if (!valid) {
    throw new ServiceError("Password saat ini salah.", 400);
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}
