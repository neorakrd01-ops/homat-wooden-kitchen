import { randomBytes } from "crypto";
import { isCurrency, toMinor, type Currency } from "./money";

export type ActionState = { error?: string; ok?: boolean; message?: string } | undefined;

export function str(form: FormData, name: string, max = 2000): string {
  return String(form.get(name) ?? "").trim().slice(0, max);
}

export function currencyOf(form: FormData, name = "currency"): Currency {
  const c = str(form, name);
  return isCurrency(c) ? c : "IQD";
}

/** Parse a money field typed in major units. Returns NaN when invalid. */
export function moneyField(form: FormData, name: string, currency: Currency): number {
  const raw = str(form, name);
  if (raw === "") return 0;
  return toMinor(raw, currency);
}

export function token(): string {
  return randomBytes(18).toString("base64url");
}

export type LineInput = { description: string; quantity: number; unitPrice: number };

/** Lines come from LinesEditor as JSON: [{description, quantity, unitPrice (major units)}] */
export function parseLines(json: string, currency: Currency): LineInput[] | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json || "[]");
  } catch {
    return null;
  }
  if (!Array.isArray(raw) || raw.length > 200) return null;
  const out: LineInput[] = [];
  for (const r of raw) {
    const description = String(r?.description ?? "").trim().slice(0, 500);
    const quantity = Number(String(r?.quantity ?? "").replace(/,/g, ""));
    const unitPrice = toMinor(String(r?.unitPrice ?? ""), currency);
    if (!description && !unitPrice) continue; // empty row
    if (!description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) return null;
    out.push({ description, quantity, unitPrice });
  }
  return out;
}
