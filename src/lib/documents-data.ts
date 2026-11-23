import { db } from "./db";
import { isDocLocale, type DocLocale } from "./i18n";
import { balanceOf, paidNet } from "./orders";

export function docLang(v: string | undefined): DocLocale {
  return isDocLocale(v) ? v : "ku";
}

export async function loadQuote(where: { id: string } | { shareToken: string }) {
  return db.quote.findUnique({ where, include: { customer: true, lines: { orderBy: { position: "asc" } } } });
}

export async function loadReceipt(where: { id: string } | { shareToken: string }) {
  const payment = await db.payment.findUnique({ where, include: { order: { include: { customer: true, payments: true } } } });
  if (!payment) return null;
  // Totals as of this receipt: payments up to and including this one.
  const upTo = payment.order.payments.filter((p) => p.number <= payment.number);
  return {
    payment,
    order: payment.order,
    paidSoFar: paidNet(upTo),
    balance: payment.order.status === "CANCELLED" ? 0 : balanceOf({ ...payment.order, payments: upTo }),
  };
}
