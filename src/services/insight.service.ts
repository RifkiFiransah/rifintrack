import { formatRupiah, formatPercent } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getBudget } from "@/services/budget.service";
import { getReportData } from "@/services/report.service";
import { listSavings } from "@/services/savings.service";

export type InsightGoal = {
  id: string;
  name: string;
  savedAmount: number;
  targetAmount: number;
  progress: number;
  monthlyAverage: number | null;
  monthsToTarget: number | null;
  estimatedDate: string | null;
};

export type FinancialInsight = {
  periodLabel: string;
  income: number;
  expense: number;
  net: number;
  savingsRate: number | null;
  topCategory: { name: string; amount: number; share: number } | null;
  budget: {
    name: string;
    share: number;
    overCount: number;
    warningCount: number;
  } | null;
  emergencyFund: {
    total: number;
    target: number;
    progress: number | null;
  } | null;
  goals: InsightGoal[];
  recommendations: string[];
};

const MONTH_LABEL = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export async function getFinancialInsight(
  userId: string,
): Promise<FinancialInsight> {
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const threeMonthsAgo = new Date(
    Date.UTC(now.getFullYear(), now.getMonth() - 3, 1),
  );

  const [report, budget, savings, movements] = await Promise.all([
    getReportData(userId, "MONTHLY", today),
    getBudget(userId, now.getFullYear(), now.getMonth() + 1),
    listSavings(userId),
    prisma.goalMovement.findMany({
      where: {
        goal: { userId },
        movementDate: { gte: threeMonthsAgo },
      },
      select: { goalId: true, type: true, amount: true },
    }),
  ]);

  const netByGoal = new Map<string, number>();

  for (const movement of movements) {
    const signed =
      movement.type === "CONTRIBUTION"
        ? Number(movement.amount)
        : -Number(movement.amount);

    netByGoal.set(movement.goalId, (netByGoal.get(movement.goalId) ?? 0) + signed);
  }

  const currentMonthMovements = await prisma.goalMovement.findMany({
    where: {
      goal: { userId },
      type: "CONTRIBUTION",
      movementDate: { gte: monthStart },
    },
    select: { amount: true },
  });

  const contributionThisMonth = currentMonthMovements.reduce(
    (total, movement) => total + Number(movement.amount),
    0,
  );

  const goals: InsightGoal[] = savings.goals.map((goal) => {
    const monthlyNet = (netByGoal.get(goal.id) ?? 0) / 3;
    const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
    const monthlyAverage = monthlyNet > 0 ? Math.round(monthlyNet) : null;
    const monthsToTarget =
      monthlyAverage && remaining > 0
        ? Math.ceil(remaining / monthlyAverage)
        : remaining === 0
          ? 0
          : null;

    let estimatedDate: string | null = null;
    if (monthsToTarget !== null && goal.targetAmount > 0) {
      const estimate = new Date(
        Date.UTC(now.getFullYear(), now.getMonth() + monthsToTarget, 1),
      );
      estimatedDate = estimate.toISOString().slice(0, 10);
    }

    return {
      id: goal.id,
      name: goal.name,
      savedAmount: goal.savedAmount,
      targetAmount: goal.targetAmount,
      progress: goal.progress,
      monthlyAverage,
      monthsToTarget,
      estimatedDate,
    };
  });

  const emergencyGoals = savings.goals.filter(
    (goal) => goal.type === "EMERGENCY_FUND",
  );
  const emergencyTotal = emergencyGoals.reduce(
    (total, goal) => total + goal.savedAmount,
    0,
  );
  const emergencyTarget = emergencyGoals.reduce(
    (total, goal) => total + goal.targetAmount,
    0,
  );

  const topSlice = report.expenseByCategory[0] ?? null;
  const topCategory = topSlice
    ? { name: topSlice.name, amount: topSlice.amount, share: topSlice.share }
    : null;

  const budgetSummary = budget
    ? {
        name: budget.name,
        share: budget.share,
        overCount: budget.items.filter((item) => item.share > 1).length,
        warningCount: budget.items.filter(
          (item) => item.share >= 0.8 && item.share <= 1,
        ).length,
      }
    : null;

  const savingsRate =
    report.summary.income > 0
      ? contributionThisMonth / report.summary.income
      : null;

  const recommendations: string[] = [];

  if (report.summary.income === 0 && report.summary.expense > 0) {
    recommendations.push(
      "Belum ada pemasukan tercatat bulan ini. Catat pemasukan agar rasio tabungan bisa dihitung.",
    );
  }
  if (report.summary.net < 0) {
    recommendations.push(
      `Pengeluaran ${formatRupiah(
        report.summary.expense,
      )} melebihi pemasukan ${formatRupiah(
        report.summary.income,
      )}. Tinjau kategori pengeluaran terbesar.`,
    );
  }
  if (topCategory && topCategory.share >= 0.35) {
    recommendations.push(
      `${topCategory.name} menyumbang ${formatPercent(
        topCategory.share,
      )} dari pengeluaran bulan ini (${formatRupiah(topCategory.amount)}).`,
    );
  }
  if (budgetSummary && budgetSummary.overCount > 0) {
    recommendations.push(
      `${budgetSummary.overCount} kategori sudah melewati limit anggaran. Kurangi pengeluaran pada kategori tersebut.`,
    );
  }
  if (budgetSummary && budgetSummary.warningCount > 0) {
    recommendations.push(
      `${budgetSummary.warningCount} kategori mendekati batas anggaran. Pantau realisasinya.`,
    );
  }
  if (savingsRate !== null && savingsRate < 0.1) {
    recommendations.push(
      `Rasio tabungan bulan ini ${formatPercent(
        savingsRate,
      )}. Usahakan menyisihkan minimal 10% pemasukan.`,
    );
  }
  if (emergencyTarget > 0 && emergencyTotal / emergencyTarget < 0.5) {
    recommendations.push(
      `Dana darurat baru ${formatPercent(
        emergencyTotal / emergencyTarget,
      )} dari target. Prioritaskan menambah dana darurat.`,
    );
  }
  if (emergencyTarget > 0 && emergencyTotal >= emergencyTarget) {
    recommendations.push(
      "Target dana darurat sudah terpenuhi. Pertimbangkan tujuan tabungan berikutnya.",
    );
  }
  if (
    report.summary.net > 0 &&
    savingsRate !== null &&
    savingsRate >= 0.2
  ) {
    recommendations.push(
      "Arus kas positif dan rasio tabungan sehat. Pertahankan pola ini.",
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      "Catat transaksi secara rutin agar insight keuanganmu semakin akurat.",
    );
  }

  return {
    periodLabel: MONTH_LABEL.format(monthStart),
    income: report.summary.income,
    expense: report.summary.expense,
    net: report.summary.net,
    savingsRate,
    topCategory,
    budget: budgetSummary,
    emergencyFund:
      emergencyTarget > 0
        ? {
            total: emergencyTotal,
            target: emergencyTarget,
            progress: emergencyTotal / emergencyTarget,
          }
        : null,
    goals,
    recommendations,
  };
}
