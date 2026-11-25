import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUser } from "@/lib/supabase/server";

export const metadata = { title: "Reset password" };

/** Reached via the recovery email link, which signs the user in through /auth/confirm. */
export default async function ResetPasswordPage() {
  if (!isSupabaseConfigured) redirect("/login?error=not_configured");
  if (!(await getUser())) redirect("/login?error=link_invalid");
  return <ResetPasswordForm />;
}
