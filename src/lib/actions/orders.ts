"use server";

import { revalidatePath } from "next/cache";
import { db, logActivity, nextNumber } from "../db";
import { requireUser } from "../session";
import { currencyOf, moneyField, parseLines, str, token, type ActionState } from "../form";
import { convert, docNumber, formatMoney, formatDate, parseDateInput, sumLines, type Currency } from "../money";
import { balanceOf, paidNet } from "../orders";

const METHODS = ["CASH", "TRANSFER", "CARD", "OTHER"];

function done(): ActionState {
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateOrderInfo(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const id = str(form, "id");
  const order = await db.order.findUnique({ where: { id } });
  if (!order) return { error: "not_found" };
  const data = {
    title: str(form, "title", 200),
    notes: str(form, "notes", 4000),
    deliveryDate: parseDateInput(str(form, "deliveryDate")),
  };
  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data });
    await logActivity(tx, {
      action: "order_info_updated",
      entity: "order",
      entityId: id,
      summary: `${docNumber("O", order.number)} details updated (delivery ${formatDate(order.deliveryDate)} → ${formatDate(data.deliveryDate)})`,
      details: { before: { title: order.title, notes: order.notes, deliveryDate: order.deliveryDate }, after: data },
    });
  });
  return done();
}

export async function reviseOrder(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const id = str(form, "id");
  const order = await db.order.findUnique({ where: { id }, include: { lines: { orderBy: { position: "asc" } }, payments: true } });
  if (!order) return { error: "not_found" };
  if (order.status === "CANCELLED") return { error: "order_cancelled" };
  const currency = order.currency as Currency;
  const reason = str(form, "reason", 1000);
  if (!reason) return { error: "reason_required" };
  const lines = parseLines(str(form, "lines", 200_000), currency);
  if (!lines || lines.length === 0) return { error: "lines_invalid" };
  const discount = moneyField(form, "discount", currency);
  if (!Number.isFinite(discount) || discount < 0) return { error: "amount_invalid" };
  const subtotal = sumLines(lines);
  if (discount > subtotal) return { error: "discount_too_big" };
  const newTotal = subtotal - discount;
  if (newTotal < paidNet(order.payments)) return { error: "total_below_paid" };

  await db.$transaction(async (tx) => {
    await tx.orderRevision.create({
      data: {
        orderId: id,
        oldTotal: order.total,
        newTotal,
        reason,
        linesSnapshot: JSON.stringify({ discount: order.discount, lines: order.lines.map(({ description, quantity, unitPrice }) => ({ description, quantity, unitPrice })) }),
      },
    });
    await tx.orderLine.deleteMany({ where: { orderId: id } });
    await tx.order.update({
      where: { id },
      data: { total: newTotal, discount, lines: { create: lines.map((l, i) => ({ ...l, position: i })) } },
    });
    await logActivity(tx, {
      action: "order_revised",
      entity: "order",
      entityId: id,
      summary: `${docNumber("O", order.number)} changed: ${formatMoney(order.total, currency)} → ${formatMoney(newTotal, currency)} (${reason})`,
      details: { lines, discount, reason },
    });
  });
  return done();
}

export async function recordPayment(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const orderId = str(form, "orderId");
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payments: true, customer: true } });
  if (!order) return { error: "not_found" };

  const kind = str(form, "kind") === "REFUND" ? "REFUND" : "PAYMENT";
  if (order.status === "CANCELLED" && kind !== "REFUND") return { error: "order_cancelled" };
  const orderCurrency = order.currency as Currency;
  const currency = currencyOf(form);
  const amount = moneyField(form, "amount", currency);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "amount_invalid" };

  let exchangeRate: number | null = null;
  if (currency !== orderCurrency) {
    exchangeRate = Number(str(form, "exchangeRate").replace(/,/g, ""));
    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) return { error: "rate_required" };
  }
  const amountInOrderCurrency = convert(amount, currency, orderCurrency, exchangeRate);
  if (!Number.isFinite(amountInOrderCurrency) || amountInOrderCurrency <= 0) return { error: "amount_invalid" };

  if (kind === "PAYMENT" && amountInOrderCurrency > balanceOf(order)) return { error: "overpay" };
  if (kind === "REFUND" && amountInOrderCurrency > paidNet(order.payments)) return { error: "refund_too_big" };

  const method = METHODS.includes(str(form, "method")) ? str(form, "method") : "CASH";
  const date = parseDateInput(str(form, "date")) ?? new Date();

  await db.$transaction(async (tx) => {
    const number = await nextNumber(tx, "payment");
    const p = await tx.payment.create({
      data: {
        number,
        orderId,
        kind,
        amount,
        currency,
        exchangeRate,
        amountInOrderCurrency,
        method,
        date,
        note: str(form, "note", 1000),
        shareToken: token(),
      },
    });
    await logActivity(tx, {
      action: kind === "REFUND" ? "refund_recorded" : "payment_recorded",
      entity: "payment",
      entityId: p.id,
      summary: `${docNumber("R", number)} ${kind === "REFUND" ? "refund" : "payment"} ${formatMoney(amount, currency)}${
        exchangeRate ? ` @ ${exchangeRate} = ${formatMoney(amountInOrderCurrency, orderCurrency)}` : ""
      } on ${docNumber("O", order.number)} (${order.customer.name})`,
    });
  });
  return done();
}

export async function cancelPayment(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const id = str(form, "id");
  const reason = str(form, "reason", 1000);
  if (!reason) return { error: "reason_required" };
  const p = await db.payment.findUnique({ where: { id }, include: { order: true } });
  if (!p) return { error: "not_found" };
  if (p.cancelled) return { error: "already_cancelled" };
  await db.$transaction(async (tx) => {
    await tx.payment.update({ where: { id }, data: { cancelled: true, cancelReason: reason, cancelledAt: new Date() } });
    await logActivity(tx, {
      action: "payment_cancelled",
      entity: "payment",
      entityId: id,
      summary: `${docNumber("R", p.number)} cancelled (${formatMoney(p.amount, p.currency)}) on ${docNumber("O", p.order.number)}: ${reason}`,
    });
  });
  return done();
}

export async function cancelOrder(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const id = str(form, "id");
  const reason = str(form, "reason", 1000);
  if (!reason) return { error: "reason_required" };
  const order = await db.order.findUnique({ where: { id }, include: { payments: true } });
  if (!order) return { error: "not_found" };
  if (order.status === "CANCELLED") return { error: "already_cancelled" };
  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data: { status: "CANCELLED", cancelReason: reason, cancelledAt: new Date() } });
    await logActivity(tx, {
      action: "order_cancelled",
      entity: "order",
      entityId: id,
      summary: `${docNumber("O", order.number)} cancelled (paid so far ${formatMoney(paidNet(order.payments), order.currency)}): ${reason}`,
    });
  });
  return done();
}

export async function setOrderStatus(form: FormData) {
  await requireUser();
  const id = str(form, "id");
  const status = str(form, "status");
  const order = await db.order.findUnique({ where: { id } });
  if (!order) return;
  const ok = (order.status === "ACTIVE" && status === "COMPLETED") || (order.status === "COMPLETED" && status === "ACTIVE");
  if (!ok) return;
  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data: { status } });
    await logActivity(tx, { action: "order_status", entity: "order", entityId: id, summary: `${docNumber("O", order.number)}: ${order.status} → ${status}` });
  });
  revalidatePath("/", "layout");
}
