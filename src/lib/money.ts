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

// All dates are shown in Iraq time, whatever clock the server uses (online servers run on UTC).
// Iraq is UTC+3 all year (no daylight saving).
export const TIME_ZONE = "Asia/Baghdad";
const IRAQ_OFFSET_HOURS = 3;
const ymdFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** "yyyy-mm-dd" of this moment in Iraq. */
function iraqYmd(d: Date): string {
  return ymdFormat.format(d);
}

export function formatDate(d: Date | string | null | undefined, digits: Digits = "western"): string {
  if (!d) return "—";
  const [y, m, day] = iraqYmd(typeof d === "string" ? new Date(d) : d).split("-");
  return toDigits(`${day}/${m}/${y}`, digits);
}

/** yyyy-mm-dd for <input type="date"> */
export function dateInput(d: Date | null | undefined): string {
  return d ? iraqYmd(new Date(d)) : "";
}

/** A typed date is stored as noon Iraq time, so it never slips to the day before or after. */
export function parseDateInput(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12 - IRAQ_OFFSET_HOURS));
}

/** Midnight at the start of the current month, Iraq time. */
export function startOfIraqMonth(now = new Date()): Date {
  const [y, m] = iraqYmd(now).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1, -IRAQ_OFFSET_HOURS));
}

/** Midnight at the start of today, Iraq time. */
export function startOfIraqDay(now = new Date()): Date {
  const [y, m, d] = iraqYmd(now).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, -IRAQ_OFFSET_HOURS));
}

export function docNumber(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(4, "0")}`;
}
