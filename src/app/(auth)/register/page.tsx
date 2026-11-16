import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/features/auth/register-form";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Daftar",
};

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return <RegisterForm />;
}
