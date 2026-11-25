export const locales = ["he", "en", "ar", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "he";
export const LOCALE_COOKIE = "nova_locale";

export const localeMeta: Record<Locale, { label: string; dir: "rtl" | "ltr" }> = {
  he: { label: "עברית", dir: "rtl" },
  en: { label: "English", dir: "ltr" },
  ar: { label: "العربية", dir: "rtl" },
  es: { label: "Español", dir: "ltr" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
