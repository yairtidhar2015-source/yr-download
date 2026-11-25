"use client";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { updateProfileAction } from "@/lib/auth/actions";
import { useI18n } from "@/lib/i18n/client";

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(updateProfileAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="error">{t.errors[state.error]}</Alert>}
      {state?.success && <Alert tone="success">{t.profile.saved}</Alert>}
      <Field label={t.common.fullName} name="fullName" defaultValue={fullName} required minLength={2} maxLength={80} />
      <Field label={t.common.email} name="email" value={email} readOnly disabled dir="ltr" className="bg-navy-50" />
      <Button type="submit" loading={pending}>{t.common.save}</Button>
    </form>
  );
}
