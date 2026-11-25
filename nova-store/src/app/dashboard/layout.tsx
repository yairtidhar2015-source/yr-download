import { DashboardShell } from "@/components/dashboard/sidebar";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireUser();
  const name = profile?.full_name || (user.user_metadata?.full_name as string | undefined) || user.email || "";
  return <DashboardShell userName={name} email={user.email ?? ""}>{children}</DashboardShell>;
}
