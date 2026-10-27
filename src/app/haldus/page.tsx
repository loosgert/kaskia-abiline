import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/admin-app";
import { LoginForm } from "@/components/admin/login-form";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Haldus · Kaskia abiline" };

export default async function Haldus() {
  return (await isAdmin()) ? <AdminApp /> : <LoginForm />;
}
