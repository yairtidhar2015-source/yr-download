"use client";
import Link from "next/link";
import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n/client";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction, type FormState } from "@/lib/auth/actions";
import type { Dictionary } from "@/i18n";

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-7 text-center">
      <h1 className="text-2xl font-extrabold text-navy-900">{title}</h1>
      <p className="mt-1.5 text-navy-400">{subtitle}</p>
    </div>
  );
}

function ErrorAlert({ state, initialError }: { state: FormState; initialError?: keyof Dictionary["errors"] }) {
  const { t } = useI18n();
  const key = state?.error ?? initialError;
  return key ? <Alert tone="error">{t.errors[key]}</Alert> : null;
}

export function LoginForm({ next, initialError }: { next?: string; initialError?: keyof Dictionary["errors"] }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <>
      <Heading title={t.auth.loginTitle} subtitle={t.auth.loginSubtitle} />
      <form action={action} className="space-y-4">
        <ErrorAlert state={state} initialError={initialError} />
        <input type="hidden" name="next" value={next ?? "/dashboard"} />
        <Field label={t.common.email} name="email" type="email" autoComplete="email" required dir="ltr" defaultValue={state?.fields?.email} />
        <Field label={t.common.password} name="password" type="password" autoComplete="current-password" required dir="ltr" />
        <div className="text-end"><Link href="/forgot-password" className="text-sm font-medium text-brand-600 hover:underline">{t.auth.forgot}</Link></div>
        <Button type="submit" loading={pending} className="w-full">{t.common.login}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-navy-400">{t.auth.noAccount} <Link href="/register" className="font-semibold text-brand-600 hover:underline">{t.common.register}</Link></p>
    </>
  );
}

function CheckEmail({ body }: { body: string }) {
  const { t } = useI18n();
  return (
    <div className="text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600"><MailCheck className="h-8 w-8" /></span>
      <h1 className="mt-5 text-2xl font-extrabold">{t.auth.checkEmailTitle}</h1>
      <p className="mt-2 text-navy-400">{body}</p>
      <Link href="/login" className="mt-6 inline-block font-semibold text-brand-600 hover:underline">{t.common.login}</Link>
    </div>
  );
}

export function RegisterForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(registerAction, undefined);
  if (state?.success) return <CheckEmail body={t.auth.checkEmailBody} />;
  return (
    <>
      <Heading title={t.auth.registerTitle} subtitle={t.auth.registerSubtitle} />
      <form action={action} className="space-y-4">
        <ErrorAlert state={state} />
        <Field label={t.common.fullName} name="fullName" autoComplete="name" required minLength={2} maxLength={80} defaultValue={state?.fields?.fullName} />
        <Field label={t.common.email} name="email" type="email" autoComplete="email" required dir="ltr" defaultValue={state?.fields?.email} />
        <Field label={t.common.password} name="password" type="password" autoComplete="new-password" required minLength={8} dir="ltr" hint={t.errors.passwordShort} />
        <Button type="submit" loading={pending} className="w-full">{t.common.register}</Button>
        <p className="text-center text-xs text-navy-400">{t.auth.acceptTerms}</p>
      </form>
      <p className="mt-6 text-center text-sm text-navy-400">{t.auth.haveAccount} <Link href="/login" className="font-semibold text-brand-600 hover:underline">{t.common.login}</Link></p>
    </>
  );
}

export function ForgotPasswordForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(forgotPasswordAction, undefined);
  if (state?.success) return <CheckEmail body={t.auth.resetSent} />;
  return (
    <>
      <Heading title={t.auth.forgotTitle} subtitle={t.auth.forgotSubtitle} />
      <form action={action} className="space-y-4">
        <ErrorAlert state={state} />
        <Field label={t.common.email} name="email" type="email" autoComplete="email" required dir="ltr" />
        <Button type="submit" loading={pending} className="w-full">{t.auth.sendLink}</Button>
      </form>
      <p className="mt-6 text-center text-sm"><Link href="/login" className="font-semibold text-brand-600 hover:underline">{t.common.login}</Link></p>
    </>
  );
}

export function ResetPasswordForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  if (state?.success) {
    return (
      <div className="space-y-5 text-center">
        <Alert tone="success">{t.auth.passwordUpdated}</Alert>
        <Link href="/dashboard" className="font-semibold text-brand-600 hover:underline">{t.common.dashboard}</Link>
      </div>
    );
  }
  return (
    <>
      <Heading title={t.auth.resetTitle} subtitle={t.auth.resetSubtitle} />
      <form action={action} className="space-y-4">
        <ErrorAlert state={state} />
        <Field label={t.auth.newPassword} name="password" type="password" autoComplete="new-password" required minLength={8} dir="ltr" />
        <Field label={t.auth.confirmPassword} name="confirm" type="password" autoComplete="new-password" required minLength={8} dir="ltr" />
        <Button type="submit" loading={pending} className="w-full">{t.auth.updatePassword}</Button>
      </form>
    </>
  );
}
