import { cache } from "react";
import { db } from "./db";
import type { Digits } from "./money";

export type Settings = {
  companyNameKu: string;
  companyNameEn: string;
  companyNameAr: string;
  companyPhone: string;
  companyAddress: string;
  quoteFooter: string;
  defaultRate: string; // IQD per 1 USD, as typed
  digits: Digits;
};

export const SETTING_DEFAULTS: Settings = {
  companyNameKu: "کارگەها مەتبەخێن هۆمات",
  companyNameEn: "Homat Kitchens",
  companyNameAr: "معمل هومات للمطابخ",
  companyPhone: "",
  companyAddress: "",
  quoteFooter: "",
  defaultRate: "1310",
  digits: "western",
};

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db.setting.findMany();
  const s: Settings = { ...SETTING_DEFAULTS };
  for (const r of rows) {
    if (r.key in s) (s as Record<string, string>)[r.key] = r.value;
  }
  if (s.digits !== "eastern") s.digits = "western";
  return s;
});

export function companyName(s: Settings, lang: string): string {
  if (lang === "en") return s.companyNameEn || s.companyNameKu;
  if (lang === "ar") return s.companyNameAr || s.companyNameKu;
  return s.companyNameKu || s.companyNameEn;
}
