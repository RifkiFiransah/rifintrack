import type { GoalMovementType, GoalType, Prisma } from "@prisma/client";
import type { z } from "zod";
import {
  savingsGoalCreateSchema,
  savingsGoalUpdateSchema,
  savingsMovementSchema,
} from "@/lib/finance-validation";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/service-error";

type GoalCreateInput = z.infer<typeof savingsGoalCreateSchema>;
type GoalUpdateInput = z.infer<typeof savingsGoalUpdateSchema>;
type MovementInput = z.infer<typeof savingsMovementSchema>;

type GoalWithMovements = Prisma.SavingsGoalGetPayload<{
  include: { movements: true };
}>;

export type SavingsMovementView = {
  id: string;
  type: GoalMovementType;
  amount: number;
  movementDate: string;
  notes: string | null;
};

export type SavingsGoalView = {
  id: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  targetDate: string | null;
  description: string | null;
  color: string | null;
  isCompleted: boolean;
  savedAmount: number;
  progress: number;
  movements: SavingsMovementView[];
};

export type SavingsSummary = {
  total: number;
  emergencyFund: number;
  personalSavings: number;
  activeGoals: number;
  completedGoals: number;
};

function sumMovements(
  movements: Array<{ type: GoalMovementType; amount: bigint }>,
) {
  let total = 0n;
  for (const movement of movements) {
    total +=
      movement.type === "CONTRIBUTION" ? movement.amount : -movement.amount;
  }
  return total;
}

function toView(goal: GoalWithMovements): SavingsGoalView {
  const saved = sumMovements(goal.movements);
  const progress =
    goal.targetAmount > 0n
      ? Math.max(0, Number(saved) / Number(goal.targetAmount))
      : 0;

  return {
    id: goal.id,
    name: goal.name,
    type: goal.type,
    targetAmount: Number(goal.targetAmount),
    targetDate: goal.targetDate
      ? goal.targetDate.toISOString().slice(0, 10)
      : null,
    description: goal.description,
    color: goal.color,
    isCompleted: goal.isCompleted,
    savedAmount: Number(saved),
    progress,
    movements: goal.movements.map((movement) => ({
      id: movement.id,
      type: movement.type,
      amount: Number(movement.amount),
      movementDate: movement.movementDate.toISOString().slice(0, 10),
      notes: movement.notes,
    })),
  };
}

async function getGoalOrThrow(userId: string, goalId: string) {
  const goal = await prisma.savingsGoal.findFirst({
    where: { id: goalId, userId },
    include: {
      movements: {
        orderBy: [{ movementDate: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!goal) {
    throw new ServiceError("Tujuan tabungan tidak ditemukan.", 404);
  }

  return toView(goal);
}

export async function listSavings(userId: string): Promise<{
  goals: SavingsGoalView[];
  summary: SavingsSummary;
}> {
  const goals = await prisma.savingsGoal.findMany({
    where: { userId },
    include: {
      movements: {
        orderBy: [{ movementDate: "desc" }, { createdAt: "desc" }],
      },
    },
    orderBy: [{ isCompleted: "asc" }, { createdAt: "desc" }],
  });

  const views = goals.map(toView);

  const total = views.reduce(
    (sum, goal) => sum + Math.max(0, goal.savedAmount),
    0,
  );
  const emergencyFund = views
    .filter((goal) => goal.type === "EMERGENCY_FUND")
    .reduce((sum, goal) => sum + Math.max(0, goal.savedAmount), 0);

  return {
    goals: views,
    summary: {
      total,
      emergencyFund,
      personalSavings: total - emergencyFund,
      activeGoals: views.filter((goal) => !goal.isCompleted).length,
      completedGoals: views.filter((goal) => goal.isCompleted).length,
    },
  };
}

export async function createSavingsGoal(
  userId: string,
  input: GoalCreateInput,
): Promise<SavingsGoalView> {
  const goal = await prisma.savingsGoal.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      targetAmount: BigInt(input.targetAmount),
      targetDate: input.targetDate ?? null,
      description: input.description || null,
      color: input.color || null,
    },
  });

  return toView({ ...goal, movements: [] });
}

export async function updateSavingsGoal(
  userId: string,
  goalId: string,
  input: GoalUpdateInput,
): Promise<SavingsGoalView> {
  const existing = await prisma.savingsGoal.findFirst({
    where: { id: goalId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new ServiceError("Tujuan tabungan tidak ditemukan.", 404);
  }

  await prisma.savingsGoal.update({
    where: { id: goalId },
    data: {
      name: input.name ?? undefined,
      targetDate:
        input.targetDate === undefined ? undefined : input.targetDate,
      description:
        input.description === undefined ? undefined : input.description || null,
      color: input.color === undefined ? undefined : input.color || null,
      isCompleted: input.isCompleted ?? undefined,
    },
  });

  return getGoalOrThrow(userId, goalId);
}

export async function addGoalMovement(
  userId: string,
  goalId: string,
  input: MovementInput,
): Promise<SavingsGoalView> {
  const goal = await prisma.savingsGoal.findFirst({
    where: { id: goalId, userId },
    include: { movements: true },
  });

  if (!goal) {
    throw new ServiceError("Tujuan tabungan tidak ditemukan.", 404);
  }

  const amount = BigInt(input.amount);
  const saved = sumMovements(goal.movements);

  if (input.type === "WITHDRAWAL" && amount > saved) {
    throw new ServiceError("Penarikan melebihi saldo tabungan.");
  }

  const nextBalance =
    input.type === "CONTRIBUTION" ? saved + amount : saved - amount;
  const isCompleted = nextBalance >= goal.targetAmount;

  await prisma.$transaction(async (tx) => {
    await tx.goalMovement.create({
      data: {
        goalId,
        type: input.type,
        amount,
        movementDate: input.movementDate,
        notes: input.notes || null,
      },
    });

    if (isCompleted !== goal.isCompleted) {
      await tx.savingsGoal.update({
        where: { id: goalId },
        data: { isCompleted },
      });
    }
  });

  return getGoalOrThrow(userId, goalId);
}

export async function deleteGoalMovement(
  userId: string,
  goalId: string,
  movementId: string,
): Promise<SavingsGoalView> {
  const goal = await prisma.savingsGoal.findFirst({
    where: { id: goalId, userId },
    include: { movements: true },
  });

  if (!goal) {
    throw new ServiceError("Tujuan tabungan tidak ditemukan.", 404);
  }

  const movement = goal.movements.find((item) => item.id === movementId);

  if (!movement) {
    throw new ServiceError("Pergerakan tabungan tidak ditemukan.", 404);
  }

  const remaining = sumMovements(
    goal.movements.filter((item) => item.id !== movementId),
  );
  const isCompleted = remaining >= goal.targetAmount;

  await prisma.$transaction(async (tx) => {
    await tx.goalMovement.delete({ where: { id: movementId } });

    if (isCompleted !== goal.isCompleted) {
      await tx.savingsGoal.update({
        where: { id: goalId },
        data: { isCompleted },
      });
    }
  });

  return getGoalOrThrow(userId, goalId);
}
