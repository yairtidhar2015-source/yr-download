import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type Profile = { id: string; full_name: string | null; avatar_url: string | null; platform_role: string; created_at: string };

/** Server-side guard: middleware already redirects, but every protected page re-checks here. */
export const requireUser = cache(async () => {
  if (!isSupabaseConfigured) redirect("/login?error=not_configured");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("id, full_name, avatar_url, platform_role, created_at").eq("id", user.id).maybeSingle<Profile>();
  return { user, profile };
});
