"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfileManager({
  initialFullName,
  initialEmail,
}: {
  initialFullName: string;
  initialEmail: string;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [email, setEmail] = useState(initialEmail);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profilePending, setProfilePending] = useState(false);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setProfilePending(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email }),
      });
      const data = (await response.json().catch(() => null)) as {
        user?: { fullName: string; email: string };
        error?: string;
      } | null;

      if (!response.ok || !data?.user) {
        setProfileError(data?.error ?? "Gagal memperbarui profil.");
        return;
      }

      setFullName(data.user.fullName);
      setEmail(data.user.email);
      setProfileSuccess("Profil berhasil diperbarui.");
      router.refresh();
    } catch {
      setProfileError("Tidak dapat terhubung ke server.");
    } finally {
      setProfilePending(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password baru tidak cocok.");
      return;
    }

    setPasswordPending(true);

    try {
      const response = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setPasswordError(data?.error ?? "Gagal memperbarui password.");
        return;
      }

      formElement.reset();
      setPasswordSuccess(
        "Password berhasil diperbarui. Sesi di perangkat lain telah dikeluarkan.",
      );
    } catch {
      setPasswordError("Tidak dapat terhubung ke server.");
    } finally {
      setPasswordPending(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form onSubmit={handleProfileSubmit} className="space-y-4 card p-6">
        <div>
          <h2 className="text-base font-semibold text-text">Informasi akun</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Perbarui nama tampilan dan email yang digunakan sebagai username
            untuk masuk.
          </p>
        </div>

        {profileError ? (
          <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {profileError}
          </p>
        ) : null}
        {profileSuccess ? (
          <p className="rounded-xl bg-success-soft px-3 py-2 text-sm text-success-text">
            {profileSuccess}
          </p>
        ) : null}

        <div className="space-y-1.5">
          <label
            htmlFor="profile-full-name"
            className="block text-sm font-medium text-text"
          >
            Nama lengkap
          </label>
          <Input
            id="profile-full-name"
            name="fullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
            placeholder="Nama kamu"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="profile-email"
            className="block text-sm font-medium text-text"
          >
            Email / username
          </label>
          <Input
            id="profile-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            maxLength={255}
            placeholder="nama@email.com"
          />
          <p className="text-xs text-text-muted">
            Email ini dipakai untuk login dan harus unik.
          </p>
        </div>

        <Button type="submit" disabled={profilePending}>
          {profilePending ? "Menyimpan..." : "Simpan perubahan"}
        </Button>
      </form>

      <form onSubmit={handlePasswordSubmit} className="space-y-4 card p-6">
        <div>
          <h2 className="text-base font-semibold text-text">Keamanan</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Ganti password secara berkala. Setelah diganti, sesi lain akan
            dikeluarkan otomatis.
          </p>
        </div>

        {passwordError ? (
          <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {passwordError}
          </p>
        ) : null}
        {passwordSuccess ? (
          <p className="rounded-xl bg-success-soft px-3 py-2 text-sm text-success-text">
            {passwordSuccess}
          </p>
        ) : null}

        <div className="space-y-1.5">
          <label
            htmlFor="current-password"
            className="block text-sm font-medium text-text"
          >
            Password saat ini
          </label>
          <Input
            id="current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            placeholder="Masukkan password saat ini"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="new-password"
            className="block text-sm font-medium text-text"
          >
            Password baru
          </label>
          <Input
            id="new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            placeholder="Minimal 8 karakter"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="confirm-password"
            className="block text-sm font-medium text-text"
          >
            Konfirmasi password baru
          </label>
          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            placeholder="Ulangi password baru"
          />
        </div>

        <Button type="submit" disabled={passwordPending}>
          {passwordPending ? "Memperbarui..." : "Perbarui password"}
        </Button>
      </form>
    </div>
  );
}
