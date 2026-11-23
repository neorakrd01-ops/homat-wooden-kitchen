type PaymentLike = { kind: string; amountInOrderCurrency: number; cancelled: boolean };

/** Money received for an order, minus refunds, ignoring cancelled entries. */
export function paidNet(payments: PaymentLike[]): number {
  return payments.reduce((s, p) => {
    if (p.cancelled) return s;
    return p.kind === "REFUND" ? s - p.amountInOrderCurrency : s + p.amountInOrderCurrency;
  }, 0);
}

/** What the customer still owes. Cancelled orders owe nothing. */
export function balanceOf(order: { total: number; status: string; payments: PaymentLike[] }): number {
  if (order.status === "CANCELLED") return 0;
  return order.total - paidNet(order.payments);
}

export function normalizeWhatsAppPhone(phone: string): string | null {
  let d = phone.replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("964")) return d;
  if (d.startsWith("0")) return "964" + d.slice(1);
  if (d.length === 10 && d.startsWith("7")) return "964" + d;
  return d;
}
