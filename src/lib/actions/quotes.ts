"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, logActivity, nextNumber } from "../db";
import { requireUser } from "../session";
import { currencyOf, moneyField, parseLines, str, token, type ActionState } from "../form";
import { docNumber, formatMoney, parseDateInput, sumLines } from "../money";

export async function createQuote(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const customerId = str(form, "customerId");
  const currency = currencyOf(form);
  const title = str(form, "title", 200);
  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { error: "customer_required" };

  const q = await db.$transaction(async (tx) => {
    const number = await nextNumber(tx, "quote");
    const q = await tx.quote.create({ data: { number, customerId, currency, title, shareToken: token() } });
    await logActivity(tx, { action: "quote_created", entity: "quote", entityId: q.id, summary: `${docNumber("Q", number)} created for ${customer.name}` });
    return q;
  });
  redirect(`/quotes/${q.id}`);
}

export async function saveQuote(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const id = str(form, "id");
  const quote = await db.quote.findUnique({ where: { id }, include: { lines: true } });
  if (!quote) return { error: "not_found" };
  if (quote.status !== "DRAFT" && quote.status !== "SENT") return { error: "quote_locked" };

  const currency = quote.currency as "IQD" | "USD";
  const lines = parseLines(str(form, "lines", 200_000), currency);
  if (!lines) return { error: "lines_invalid" };
  const discount = moneyField(form, "discount", currency);
  if (!Number.isFinite(discount) || discount < 0) return { error: "amount_invalid" };
  const subtotal = sumLines(lines);
  if (discount > subtotal) return { error: "discount_too_big" };

  await db.$transaction(async (tx) => {
    await tx.quoteLine.deleteMany({ where: { quoteId: id } });
    await tx.quote.update({
      where: { id },
      data: {
        title: str(form, "title", 200),
        notes: str(form, "notes", 4000),
        discount,
        lines: { create: lines.map((l, i) => ({ ...l, position: i })) },
      },
    });
    await logActivity(tx, {
      action: "quote_saved",
      entity: "quote",
      entityId: id,
      summary: `${docNumber("Q", quote.number)} saved, total ${formatMoney(subtotal - discount, currency)}`,
      details: { lines, discount },
    });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

const ALLOWED: Record<string, string[]> = {
  DRAFT: ["SENT", "REJECTED"],
  SENT: ["DRAFT", "REJECTED"],
  REJECTED: ["DRAFT"],
};

export async function setQuoteStatus(form: FormData) {
  await requireUser();
  const id = str(form, "id");
  const status = str(form, "status");
  const quote = await db.quote.findUnique({ where: { id } });
  if (!quote || !ALLOWED[quote.status]?.includes(status)) return;
  await db.$transaction(async (tx) => {
    await tx.quote.update({ where: { id }, data: { status } });
    await logActivity(tx, { action: "quote_status", entity: "quote", entityId: id, summary: `${docNumber("Q", quote.number)}: ${quote.status} → ${status}` });
  });
  revalidatePath("/", "layout");
}

export async function acceptQuote(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const id = str(form, "id");
  const quote = await db.quote.findUnique({ where: { id }, include: { lines: { orderBy: { position: "asc" } }, customer: true } });
  if (!quote) return { error: "not_found" };
  if (quote.status !== "DRAFT" && quote.status !== "SENT") return { error: "quote_locked" };
  if (quote.lines.length === 0) return { error: "lines_empty" };
  const deliveryDate = parseDateInput(str(form, "deliveryDate"));
  const total = sumLines(quote.lines) - quote.discount;

  const order = await db.$transaction(async (tx) => {
    const number = await nextNumber(tx, "order");
    const order = await tx.order.create({
      data: {
        number,
        customerId: quote.customerId,
        quoteId: quote.id,
        title: quote.title,
        currency: quote.currency,
        total,
        discount: quote.discount,
        deliveryDate,
        lines: {
          create: quote.lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, position: l.position })),
        },
      },
    });
    await tx.quote.update({ where: { id }, data: { status: "ACCEPTED" } });
    await logActivity(tx, {
      action: "quote_accepted",
      entity: "order",
      entityId: order.id,
      summary: `${docNumber("Q", quote.number)} accepted → order ${docNumber("O", number)} for ${quote.customer.name}, ${formatMoney(total, quote.currency)}`,
    });
    return order;
  });
  redirect(`/orders/${order.id}`);
}
