"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CategoryView } from "@/services/category.service";

export function CategoryManager({ categories }: { categories: CategoryView[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          type: form.get("type"),
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setError(data?.error ?? "Gagal menambah kategori.");
        return;
      }

      formElement.reset();
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setPending(false);
    }
  }

  async function toggleArchive(category: CategoryView) {
    setError(null);
    setPending(true);

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !category.isArchived }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Gagal memperbarui kategori.");
        return;
      }

      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setPending(false);
    }
  }

  const expense = categories.filter((category) => category.type === "EXPENSE");
  const income = categories.filter((category) => category.type === "INCOME");

  function renderGroup(title: string, items: CategoryView[]) {
    return (
      <div className="card">
        <h2 className="border-b border-border px-6 py-4 text-sm font-semibold text-text">
          {title}
        </h2>
        {items.length === 0 ? (
          <p className="px-6 py-6 text-sm text-text-secondary">
            Belum ada kategori.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((category) => (
              <li
                key={category.id}
                className={`flex items-center justify-between gap-4 px-6 py-3 ${
                  category.isArchived ? "opacity-60" : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-medium text-text">
                    {category.name}
                  </p>
                  {category.isDefault ? <Badge>Default</Badge> : null}
                  {category.isArchived ? <Badge tone="warning">Arsip</Badge> : null}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => toggleArchive(category)}
                >
                  {category.isArchived ? "Aktifkan" : "Arsipkan"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <form
        onSubmit={handleCreate}
        className="space-y-4 card p-6"
      >
        <h2 className="text-sm font-semibold text-text">Tambah kategori</h2>

        {error ? (
          <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="category-name" className="block text-sm font-medium text-text">
            Nama
          </label>
          <Input
            id="category-name"
            name="name"
            required
            maxLength={80}
            placeholder="Kopi"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="category-type" className="block text-sm font-medium text-text">
            Tipe
          </label>
          <Select id="category-type" name="type" defaultValue="EXPENSE">
            <option value="EXPENSE">Pengeluaran</option>
            <option value="INCOME">Pemasukan</option>
          </Select>
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Menyimpan..." : "Tambah kategori"}
        </Button>
      </form>

      <div className="space-y-6">
        {renderGroup("Pengeluaran", expense)}
        {renderGroup("Pemasukan", income)}
      </div>
    </div>
  );
}
