"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { setLocale } from "@/lib/i18n/actions";
import { localeMeta, locales } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="relative inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm text-navy-500 hover:bg-brand-50">
      <Globe className="h-4 w-4" />
      <span className="sr-only">{t.common.language}</span>
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => start(async () => { await setLocale(e.target.value); router.refresh(); })}
        className="cursor-pointer appearance-none bg-transparent pe-1 font-medium focus:outline-none"
      >
        {locales.map((l) => <option key={l} value={l}>{localeMeta[l].label}</option>)}
      </select>
    </label>
  );
}
