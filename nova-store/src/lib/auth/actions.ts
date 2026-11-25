"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteUrl } from "@/lib/supabase/env";
import { rateLimit } from "@/lib/rate-limit";
import { safeNext } from "@/lib/utils";
import type { Dictionary } from "@/i18n";

type ErrorKey = keyof Dictionary["errors"];
export type FormState = { error?: ErrorKey; success?: boolean; fields?: Record<string, string> } | undefined;

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(8).max(72);

async function guard(action: string): Promise<ErrorKey | null> {
  if (!isSupabaseConfigured) return "notConfigured";
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return rateLimit(`${action}:${ip}`, 8, 60_000) ? null : "rateLimited";
}

function mapAuthError(message: string, status?: number): ErrorKey {
  const m = message.toLowerCase();
  if (status === 429 || m.includes("rate limit")) return "rateLimited";
  if (m.includes("not confirmed")) return "emailNotConfirmed";
  if (m.includes("invalid login")) return "invalidCredentials";
  return "generic";
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const blocked = await guard("login");
  if (blocked) return { error: blocked };
  const e = email.safeParse(form.get("email"));
  if (!e.success) return { error: "invalidEmail" };
  const p = z.string().min(1).max(72).safeParse(form.get("password"));
  if (!p.success) return { error: "invalidCredentials", fields: { email: e.data } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: e.data, password: p.data });
  if (error) return { error: mapAuthError(error.message, error.status), fields: { email: e.data } };
  redirect(safeNext(form.get("next")));
}

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  const blocked = await guard("register");
  if (blocked) return { error: blocked };
  const name = z.string().trim().min(2).max(80).safeParse(form.get("fullName"));
  const e = email.safeParse(form.get("email"));
  const fields = { fullName: String(form.get("fullName") ?? ""), email: String(form.get("email") ?? "") };
  if (!name.success) return { error: "nameRequired", fields };
  if (!e.success) return { error: "invalidEmail", fields };
  const p = password.safeParse(form.get("password"));
  if (!p.success) return { error: "passwordShort", fields };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: e.data,
    password: p.data,
    options: { data: { full_name: name.data }, emailRedirectTo: `${siteUrl()}/auth/confirm?next=/dashboard` },
  });
  if (error) return { error: mapAuthError(error.message, error.status), fields };
  // If email confirmation is disabled in Supabase, a session is returned immediately.
  if (data.session) redirect("/dashboard");
  return { success: true };
}

export async function forgotPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const blocked = await guard("forgot");
  if (blocked) return { error: blocked };
  const e = email.safeParse(form.get("email"));
  if (!e.success) return { error: "invalidEmail" };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(e.data, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/reset-password`,
  });
  if (error && (error.status === 429 || error.message.toLowerCase().includes("rate"))) return { error: "rateLimited" };
  // Always report success so the form does not reveal which emails are registered.
  return { success: true };
}

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const blocked = await guard("reset");
  if (blocked) return { error: blocked };
  const p = password.safeParse(form.get("password"));
  if (!p.success) return { error: "passwordShort" };
  if (form.get("confirm") !== p.data) return { error: "passwordMismatch" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "linkInvalid" };
  const { error } = await supabase.auth.updateUser({ password: p.data });
  if (error) return { error: mapAuthError(error.message, error.status) };
  return { success: true };
}

export async function logoutAction() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function updateProfileAction(_: FormState, form: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return { error: "notConfigured" };
  const name = z.string().trim().min(2).max(80).safeParse(form.get("fullName"));
  if (!name.success) return { error: "nameRequired" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "linkInvalid" };
  // RLS restricts this update to the caller's own row.
  const { error } = await supabase.from("profiles").update({ full_name: name.data }).eq("id", user.id);
  if (error) return { error: "generic" };
  return { success: true };
}
