// Money helpers. Amounts are integers in minor units:
// IQD = dinars, USD = cents. Exchange rate = IQD per 1 USD.

export const CURRENCIES = ["IQD", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export function isCurrency(v: unknown): v is Currency {
  return v === "IQD" || v === "USD";
}

const FACTOR: Record<Currency, number> = { IQD: 1, USD: 100 };

/** Parse what the user typed ("1,250,000" or "1250.50") into minor units. */
export function toMinor(input: string | number, currency: Currency): number {
  const n = typeof input === "number" ? input : Number(String(input).replace(/[,\s]/g, "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))));
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * FACTOR[currency]);
}

/** Minor units -> plain number for form inputs. */
export function toMajor(minor: number, currency: Currency): number {
  return minor / FACTOR[currency];
}

/** Convert an amount from one currency to another using IQD-per-USD rate. */
export function convert(minor: number, from: Currency, to: Currency, rate: number | null | undefined): number {
  if (from === to) return minor;
  if (!rate || rate <= 0) return NaN;
  if (from === "IQD" && to === "USD") return Math.round((minor / rate) * 100);
  return Math.round((minor / 100) * rate); // USD -> IQD
}

export type Digits = "western" | "eastern";

export function toDigits(s: string, digits: Digits): string {
  if (digits === "western") return s;
  return s.replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

export function formatNumber(n: number, digits: Digits = "western", fraction = 0): string {
  const s = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fraction,
    maximumFractionDigits: Math.max(fraction, 2),
  }).format(n);
  return toDigits(s, digits);
}

export function formatMoney(minor: number, currency: Currency | string, digits: Digits = "western"): string {
  if (currency === "USD") return toDigits("$", digits) + formatNumber(minor / 100, digits, 2);
  return formatNumber(minor, digits, 0) + " IQD";
}

export function lineTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice);
}

export function sumLines(lines: { quantity: number; unitPrice: number }[]): number {
  return lines.reduce((s, l) => s + lineTotal(l.quantity, l.unitPrice), 0);
}

export function formatDate(d: Date | string | null | undefined, digits: Digits = "western"): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return toDigits(`${dd}/${mm}/${date.getFullYear()}`, digits);
}

/** yyyy-mm-dd for <input type="date"> */
export function dateInput(d: Date | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDateInput(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

export function docNumber(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(4, "0")}`;
}
