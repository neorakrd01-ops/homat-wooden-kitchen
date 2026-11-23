import { cookies } from "next/headers";
import { en, type Key } from "./en";
import { ku } from "./ku";
import { ar } from "./ar";

export type { Key };
export type UiLocale = "ku" | "en";
export type DocLocale = "ku" | "en" | "ar";

const dicts: Record<DocLocale, Partial<Record<Key, string>>> = { en, ku, ar };

export const LANG_COOKIE = "homat_lang";

export function dirOf(locale: string): "rtl" | "ltr" {
  return locale === "en" ? "ltr" : "rtl";
}

export function isDocLocale(v: unknown): v is DocLocale {
  return v === "ku" || v === "en" || v === "ar";
}

export type T = (key: Key, vars?: Record<string, string | number>) => string;

export function makeT(locale: DocLocale): T {
  const d = dicts[locale];
  return (key, vars) => {
    let s = d[key] ?? en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}

export async function getUiLocale(): Promise<UiLocale> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return v === "en" ? "en" : "ku";
}

export async function getT() {
  const locale = await getUiLocale();
  return { t: makeT(locale), locale, dir: dirOf(locale) };
}
