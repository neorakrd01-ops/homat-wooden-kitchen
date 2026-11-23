"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { db, logActivity, nextNumber, type Tx } from "../db";
import { requireUser } from "../session";
import { currencyOf, moneyField, str, token, type ActionState } from "../form";
import { docNumber, formatMoney, isCurrency, parseDateInput, toMinor, type Currency } from "../money";

type ImportRow = {
  customerId?: string;
  customerName: string;
  phone: string;
  title: string;
  currency: Currency;
  total: number;
  paid: number;
  deliveryDate: Date | null;
  notes: string;
};

async function createImported(tx: Tx, row: ImportRow) {
  let customerId = row.customerId;
  if (!customerId) {
    const existing = row.phone
      ? await tx.customer.findFirst({ where: { phone: row.phone } })
      : await tx.customer.findFirst({ where: { name: row.customerName } });
    customerId = existing?.id ?? (await tx.customer.create({ data: { name: row.customerName, phone: row.phone } })).id;
  }
  const number = await nextNumber(tx, "order");
  const order = await tx.order.create({
    data: {
      number,
      customerId,
      title: row.title,
      currency: row.currency,
      total: row.total,
      deliveryDate: row.deliveryDate,
      notes: row.notes,
      imported: true,
      lines: { create: [{ description: row.title || "Imported order", quantity: 1, unitPrice: row.total, position: 0 }] },
    },
  });
  if (row.paid > 0) {
    const pn = await nextNumber(tx, "payment");
    await tx.payment.create({
      data: {
        number: pn,
        orderId: order.id,
        kind: "OPENING",
        amount: row.paid,
        currency: row.currency,
        amountInOrderCurrency: row.paid,
        method: "OTHER",
        note: "Paid before the system (opening balance)",
        shareToken: token(),
      },
    });
  }
  await logActivity(tx, {
    action: "order_imported",
    entity: "order",
    entityId: order.id,
    summary: `${docNumber("O", number)} imported: total ${formatMoney(row.total, row.currency)}, already paid ${formatMoney(row.paid, row.currency)}`,
    details: row,
  });
}

export async function importOrder(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const currency = currencyOf(form);
  const customerId = str(form, "customerId");
  const row: ImportRow = {
    customerId: customerId || undefined,
    customerName: str(form, "customerName", 200),
    phone: str(form, "phone", 50),
    title: str(form, "title", 200),
    currency,
    total: moneyField(form, "total", currency),
    paid: moneyField(form, "paid", currency),
    deliveryDate: parseDateInput(str(form, "deliveryDate")),
    notes: str(form, "notes", 2000),
  };
  if (!row.customerId && !row.customerName) return { error: "customer_required" };
  if (row.customerId && !(await db.customer.findUnique({ where: { id: row.customerId } }))) return { error: "customer_required" };
  if (!Number.isFinite(row.total) || row.total <= 0) return { error: "amount_invalid" };
  if (!Number.isFinite(row.paid) || row.paid < 0 || row.paid > row.total) return { error: "paid_too_big" };

  await db.$transaction((tx) => createImported(tx, row));
  revalidatePath("/", "layout");
  return { ok: true };
}

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("text" in v && typeof v.text === "string") return v.text;
    if ("result" in v) return String(v.result ?? "");
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
  }
  return String(v).trim();
}

function parseAnyDate(v: ExcelJS.CellValue): Date | null | "invalid" {
  if (v == null || v === "") return null;
  if (v instanceof Date) return new Date(v.getFullYear(), v.getMonth(), v.getDate(), 12);
  const s = cellText(v);
  if (!s) return null;
  const iso = parseDateInput(s);
  if (iso) return iso;
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12);
  return "invalid";
}

/** Columns: A customer name, B phone, C order title, D currency, E total, F already paid, G delivery date, H notes. */
export async function importExcel(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "file_required" };

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await file.arrayBuffer());
  } catch {
    return { error: "file_invalid" };
  }
  const ws = wb.worksheets[0];
  if (!ws) return { error: "file_invalid" };

  const rows: ImportRow[] = [];
  const problems: string[] = [];
  ws.eachRow((r, i) => {
    if (i === 1) return; // header
    const name = cellText(r.getCell(1).value);
    const totalRaw = cellText(r.getCell(5).value);
    if (!name && !totalRaw) return; // blank row
    const cur = cellText(r.getCell(4).value).toUpperCase() || "IQD";
    if (!isCurrency(cur)) return void problems.push(`${i}: currency`);
    const total = toMinor(totalRaw, cur);
    const paid = toMinor(cellText(r.getCell(6).value) || "0", cur);
    const date = parseAnyDate(r.getCell(7).value);
    if (!name) return void problems.push(`${i}: name`);
    if (!Number.isFinite(total) || total <= 0) return void problems.push(`${i}: total`);
    if (!Number.isFinite(paid) || paid < 0 || paid > total) return void problems.push(`${i}: paid`);
    if (date === "invalid") return void problems.push(`${i}: date`);
    rows.push({
      customerName: name.slice(0, 200),
      phone: cellText(r.getCell(2).value).slice(0, 50),
      title: cellText(r.getCell(3).value).slice(0, 200),
      currency: cur,
      total,
      paid,
      deliveryDate: date,
      notes: cellText(r.getCell(8).value).slice(0, 2000),
    });
  });

  // All or nothing: if any row has a problem, import nothing.
  if (problems.length) return { error: "rows_invalid", message: problems.join(", ") };
  if (rows.length === 0) return { error: "file_empty" };

  await db.$transaction(async (tx) => {
    for (const row of rows) await createImported(tx, row);
  }, { timeout: 60_000 });
  revalidatePath("/", "layout");
  return { ok: true, message: String(rows.length) };
}
