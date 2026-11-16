import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProfileManager } from "@/features/profile/profile-manager";
import { getSession } from "@/lib/auth";
import { formatDate } from "@/lib/money";
import { getInitials } from "@/lib/user";

export const metadata: Metadata = {
  title: "Profil",
};

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { user } = session;
  const initials = getInitials(user.fullName) || "U";
  const joinedAt = formatDate(user.createdAt.toISOString());

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Akun
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text">Profil</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Kelola identitas, username, dan keamanan akunmu.
        </p>
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center gap-4 p-5 sm:gap-5 sm:p-6">
          <span className="bg-brand flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold text-white shadow-brand sm:h-20 sm:w-20 sm:text-2xl">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-text">
                {user.fullName}
              </h2>
              <Badge tone="success">Akun aktif</Badge>
            </div>
            <p className="mt-1 truncate text-sm text-text-secondary">
              {user.email}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                Bergabung {joinedAt}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                Password dilindungi hash
              </span>
            </div>
          </div>
        </div>
      </section>

      <ProfileManager
        initialFullName={user.fullName}
        initialEmail={user.email}
      />
    </div>
  );
}
