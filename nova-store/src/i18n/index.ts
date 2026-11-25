import he, { type Dictionary } from "./he";
import en from "./en";
import ar from "./ar";
import es from "./es";
import type { Locale } from "@/lib/i18n/config";

export type { Dictionary };
export const dictionaries: Record<Locale, Dictionary> = { he, en, ar, es };
