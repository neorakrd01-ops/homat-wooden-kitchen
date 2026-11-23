import { getT, type T } from "./i18n";
import { getSettings } from "./settings";
import { formatDate, formatMoney, toMajor, type Currency } from "./money";
import { errorMessages } from "./errors";

/** Everything a page needs to render text, money and dates in the right language. */
export async function getView() {
  const { t, locale, dir } = await getT();
  const settings = await getSettings();
  const digits = settings.digits;
  return {
    t,
    locale,
    dir,
    settings,
    errors: errorMessages(t),
    money: (minor: number, currency: string) => formatMoney(minor, currency, digits),
    date: (d: Date | null | undefined) => formatDate(d, digits),
  };
}

export function linesText(t: T) {
  return {
    description: t("line_description"),
    quantity: t("line_quantity"),
    unitPrice: t("line_unit_price"),
    lineTotal: t("line_total"),
    addLine: t("line_add"),
    addFromList: t("line_add_from_list"),
    subtotal: t("subtotal"),
    discount: t("discount"),
    total: t("total"),
    remove: t("remove"),
  };
}

/** Line rows for LinesEditor: prices back in major units as text. */
export function editorLines(lines: { description: string; quantity: number; unitPrice: number }[], currency: Currency) {
  return lines.map((l) => ({ description: l.description, quantity: String(l.quantity), unitPrice: String(toMajor(l.unitPrice, currency)) }));
}

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-stone-100 text-stone-700",
  SENT: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-700",
  ACTIVE: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-700",
};
