"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate, formatPercent, formatRupiah, parseRupiahInput } from "@/lib/money";
import type { SavingsGoalView, SavingsSummary } from "@/services/savings.service";

const GOAL_TYPE_LABELS: Record<SavingsGoalView["type"], string> = {
  EMERGENCY_FUND: "Dana darurat",
  PERSONAL_SAVINGS: "Tabungan pribadi",
  PURCHASE: "Pembelian",
  TRAVEL: "Perjalanan",
  OTHER: "Lainnya",
};

export function SavingsManager({
  goals,
  summary,
  today,
}: {
  goals: SavingsGoalView[];
  summary: SavingsSummary;
  today: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function request(path: string, init: RequestInit) {
    setError(null);
    setPending(true);

    try {
      const response = await fetch(path, init);
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setError(data?.error ?? "Terjadi kesalahan.");
        return false;
      }

      router.refresh();
      return true;
    } catch {
      setError("Tidak dapat terhubung ke server.");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function handleCreateGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const ok = await request("/api/savings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        type: form.get("type"),
        targetAmount: parseRupiahInput(String(form.get("targetAmount") ?? "")),
        targetDate: String(form.get("targetDate") ?? "") || undefined,
        description: String(form.get("description") ?? ""),
      }),
    });

    if (ok) formElement.reset();
  }

  async function handleMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const goalId = String(form.get("goalId") ?? "");

    if (!goalId) {
      setError("Pilih tujuan tabungan terlebih dahulu.");
      return;
    }

    const ok = await request(`/api/savings/${goalId}/movements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.get("type"),
        amount: parseRupiahInput(String(form.get("amount") ?? "")),
        movementDate: String(form.get("movementDate") || today),
        notes: String(form.get("notes") ?? ""),
      }),
    });

    if (ok) formElement.reset();
  }

  async function handleDeleteMovement(goalId: string, movementId: string) {
    if (!window.confirm("Hapus pergerakan tabungan ini?")) return;

    await request(`/api/savings/${goalId}/movements/${movementId}`, {
      method: "DELETE",
    });
  }

  async function handleToggleComplete(goal: SavingsGoalView) {
    await request(`/api/savings/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: !goal.isCompleted }),
    });
  }

  return (
    <div className="space-y-6">
      <section
        aria-label="Ringkasan tabungan"
        className="grid gap-4 sm:grid-cols-3"
      >
        <StatCard label="Total tabungan" value={formatRupiah(summary.total)} />
        <StatCard
          label="Dana darurat"
          value={formatRupiah(summary.emergencyFund)}
        />
        <StatCard
          label="Tabungan pribadi"
          value={formatRupiah(summary.personalSavings)}
        />
      </section>

      {error ? (
        <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <form
            onSubmit={handleCreateGoal}
            className="space-y-4 card p-6"
          >
            <h2 className="text-sm font-semibold text-text">Tujuan baru</h2>

            <div className="space-y-1.5">
              <label htmlFor="goal-name" className="block text-sm font-medium text-text">
                Nama
              </label>
              <Input id="goal-name" name="name" required maxLength={100} placeholder="Dana darurat" />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="goal-type" className="block text-sm font-medium text-text">
                Tipe
              </label>
              <Select id="goal-type" name="type" defaultValue="EMERGENCY_FUND">
                <option value="EMERGENCY_FUND">Dana darurat</option>
                <option value="PERSONAL_SAVINGS">Tabungan pribadi</option>
                <option value="PURCHASE">Pembelian</option>
                <option value="TRAVEL">Perjalanan</option>
                <option value="OTHER">Lainnya</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="goal-target" className="block text-sm font-medium text-text">
                Target
              </label>
              <Input
                id="goal-target"
                name="targetAmount"
                inputMode="numeric"
                required
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="goal-date" className="block text-sm font-medium text-text">
                Tenggat (opsional)
              </label>
              <Input id="goal-date" name="targetDate" type="date" />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="goal-description" className="block text-sm font-medium text-text">
                Catatan (opsional)
              </label>
              <Input id="goal-description" name="description" maxLength={2000} />
            </div>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Menyimpan..." : "Tambah tujuan"}
            </Button>
          </form>

          <form
            onSubmit={handleMovement}
            className="space-y-4 card p-6"
          >
            <h2 className="text-sm font-semibold text-text">
              Catat pergerakan
            </h2>

            <div className="space-y-1.5">
              <label htmlFor="movement-goal" className="block text-sm font-medium text-text">
                Tujuan
              </label>
              <Select id="movement-goal" name="goalId" defaultValue="">
                <option value="">Pilih tujuan</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="movement-type" className="block text-sm font-medium text-text">
                Jenis
              </label>
              <Select id="movement-type" name="type" defaultValue="CONTRIBUTION">
                <option value="CONTRIBUTION">Kontribusi</option>
                <option value="WITHDRAWAL">Penarikan</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="movement-amount" className="block text-sm font-medium text-text">
                Nominal
              </label>
              <Input
                id="movement-amount"
                name="amount"
                inputMode="numeric"
                required
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="movement-date" className="block text-sm font-medium text-text">
                Tanggal
              </label>
              <Input
                id="movement-date"
                name="movementDate"
                type="date"
                required
                defaultValue={today}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="movement-notes" className="block text-sm font-medium text-text">
                Catatan (opsional)
              </label>
              <Input id="movement-notes" name="notes" maxLength={255} />
            </div>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Menyimpan..." : "Simpan pergerakan"}
            </Button>
          </form>
        </div>

        <div className="space-y-4">
          {goals.length === 0 ? (
            <div className="card p-6">
              <p className="text-sm text-text-secondary">
                Belum ada tujuan tabungan. Tambahkan tujuan pertamamu.
              </p>
            </div>
          ) : (
            goals.map((goal) => {
              const percent = Math.max(0, goal.progress);
              const barWidth = Math.min(100, percent * 100);

              return (
                <div
                  key={goal.id}
                  className="card p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-text">
                          {goal.name}
                        </h2>
                        <Badge>{GOAL_TYPE_LABELS[goal.type]}</Badge>
                        {goal.isCompleted ? (
                          <Badge tone="success">Selesai</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">
                        {formatRupiah(goal.savedAmount)} dari{" "}
                        {formatRupiah(goal.targetAmount)} •{" "}
                        {formatPercent(percent)}
                      </p>
                      {goal.targetDate ? (
                        <p className="mt-0.5 text-xs text-text-secondary">
                          Tenggat {formatDate(goal.targetDate)}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 px-3 text-xs"
                      disabled={pending}
                      onClick={() => handleToggleComplete(goal)}
                    >
                      {goal.isCompleted ? "Buka lagi" : "Tandai selesai"}
                    </Button>
                  </div>

                  <div className="mt-3 h-2.5 overflow-hidden rounded-sm bg-surface-muted">
                    <div
                      className={`h-full rounded-sm ${
                        goal.isCompleted ? "bg-success" : "bg-primary"
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  {goal.description ? (
                    <p className="mt-3 text-sm text-text-secondary">
                      {goal.description}
                    </p>
                  ) : null}

                  <div className="mt-4 border-t border-border pt-3">
                    <h3 className="text-xs font-medium text-text-secondary">
                      Pergerakan terakhir
                    </h3>
                    {goal.movements.length === 0 ? (
                      <p className="mt-2 text-sm text-text-secondary">
                        Belum ada pergerakan.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {goal.movements.slice(0, 5).map((movement) => (
                          <li
                            key={movement.id}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-text">
                                {movement.type === "CONTRIBUTION"
                                  ? "Kontribusi"
                                  : "Penarikan"}
                                {movement.notes ? ` • ${movement.notes}` : ""}
                              </p>
                              <p className="text-xs text-text-secondary">
                                {formatDate(movement.movementDate)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`whitespace-nowrap text-sm font-medium ${
                                  movement.type === "CONTRIBUTION"
                                    ? "text-success-text"
                                    : "text-danger"
                                }`}
                              >
                                {movement.type === "CONTRIBUTION" ? "+" : "-"}
                                {formatRupiah(movement.amount)}
                              </span>
                              <Button
                                type="button"
                                variant="secondary"
                                className="h-7 px-2 text-xs"
                                disabled={pending}
                                onClick={() =>
                                  handleDeleteMovement(goal.id, movement.id)
                                }
                              >
                                Hapus
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
