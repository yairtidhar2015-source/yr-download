import "server-only";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, localeMeta, LOCALE_COOKIE, type Locale } from "./config";
import { dictionaries, type Dictionary } from "@/i18n";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function getI18n(): Promise<{ locale: Locale; dir: "rtl" | "ltr"; t: Dictionary }> {
  const locale = await getLocale();
  return { locale, dir: localeMeta[locale].dir, t: dictionaries[locale] };
}
