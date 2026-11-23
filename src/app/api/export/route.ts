import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { docNumber, sumLines, toMajor, type Currency } from "@/lib/money";
import { balanceOf, paidNet } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** Full backup of the important records as an Excel file. */
export async function GET() {
  if (!(await getSessionUserId())) return new Response("Unauthorized", { status: 401 });

  const [customers, quotes, orders, payments, prices, activity] = await Promise.all([
    db.customer.findMany({ orderBy: { createdAt: "asc" } }),
    db.quote.findMany({ orderBy: { number: "asc" }, include: { customer: true, lines: true } }),
    db.order.findMany({ orderBy: { number: "asc" }, include: { customer: true, payments: true, lines: true } }),
    db.payment.findMany({ orderBy: { number: "asc" }, include: { order: { include: { customer: true } } } }),
    db.priceItem.findMany({ orderBy: { nameKu: "asc" } }),
    db.activityLog.findMany({ orderBy: { at: "asc" } }),
  ]);
  const m = (minor: number, c: string) => toMajor(minor, c as Currency);

  const wb = new ExcelJS.Workbook();
  wb.created = new Date();

  const add = (name: string, columns: { header: string; key: string; width?: number }[], rows: Record<string, unknown>[]) => {
    const ws = wb.addWorksheet(name);
    ws.columns = columns.map((c) => ({ width: 16, ...c }));
    ws.getRow(1).font = { bold: true };
    rows.forEach((r) => ws.addRow(r));
  };

  add("Customers", [
    { header: "Name", key: "name", width: 28 }, { header: "Phone", key: "phone" }, { header: "Address", key: "address", width: 30 },
    { header: "Notes", key: "notes", width: 30 }, { header: "Created", key: "createdAt" },
  ], customers);

  add("Orders", [
    { header: "Order", key: "num" }, { header: "Customer", key: "customer", width: 28 }, { header: "Title", key: "title", width: 28 },
    { header: "Status", key: "status" }, { header: "Currency", key: "currency" }, { header: "Total", key: "total" },
    { header: "Paid", key: "paid" }, { header: "Balance", key: "balance" }, { header: "Delivery", key: "deliveryDate" },
    { header: "Imported", key: "imported" }, { header: "Cancel reason", key: "cancelReason", width: 30 }, { header: "Notes", key: "notes", width: 30 },
  ], orders.map((o) => ({
    num: docNumber("O", o.number), customer: o.customer.name, title: o.title, status: o.status, currency: o.currency,
    total: m(o.total, o.currency), paid: m(paidNet(o.payments), o.currency), balance: m(balanceOf(o), o.currency),
    deliveryDate: o.deliveryDate, imported: o.imported ? "yes" : "", cancelReason: o.cancelReason, notes: o.notes,
  })));

  add("Order lines", [
    { header: "Order", key: "num" }, { header: "Description", key: "description", width: 40 }, { header: "Qty", key: "quantity" },
    { header: "Unit price", key: "unitPrice" }, { header: "Currency", key: "currency" },
  ], orders.flatMap((o) => o.lines.map((l) => ({ num: docNumber("O", o.number), description: l.description, quantity: l.quantity, unitPrice: m(l.unitPrice, o.currency), currency: o.currency }))));

  add("Payments", [
    { header: "Receipt", key: "num" }, { header: "Date", key: "date" }, { header: "Order", key: "order" },
    { header: "Customer", key: "customer", width: 28 }, { header: "Type", key: "kind" }, { header: "Amount", key: "amount" },
    { header: "Currency", key: "currency" }, { header: "Rate", key: "rate" }, { header: "In order currency", key: "inOrder" },
    { header: "Method", key: "method" }, { header: "Note", key: "note", width: 30 }, { header: "Cancelled", key: "cancelled" },
    { header: "Cancel reason", key: "cancelReason", width: 30 },
  ], payments.map((p) => ({
    num: docNumber("R", p.number), date: p.date, order: docNumber("O", p.order.number), customer: p.order.customer.name,
    kind: p.kind, amount: m(p.amount, p.currency), currency: p.currency, rate: p.exchangeRate ?? "",
    inOrder: m(p.amountInOrderCurrency, p.order.currency), method: p.method, note: p.note,
    cancelled: p.cancelled ? "yes" : "", cancelReason: p.cancelReason,
  })));

  add("Quotes", [
    { header: "Quote", key: "num" }, { header: "Customer", key: "customer", width: 28 }, { header: "Title", key: "title", width: 28 },
    { header: "Status", key: "status" }, { header: "Currency", key: "currency" }, { header: "Total", key: "total" }, { header: "Created", key: "createdAt" },
  ], quotes.map((q) => ({
    num: docNumber("Q", q.number), customer: q.customer.name, title: q.title, status: q.status, currency: q.currency,
    total: m(sumLines(q.lines) - q.discount, q.currency), createdAt: q.createdAt,
  })));

  add("Price list", [
    { header: "Name (KU)", key: "nameKu", width: 28 }, { header: "Name (EN)", key: "nameEn", width: 28 }, { header: "Name (AR)", key: "nameAr", width: 28 },
    { header: "Unit", key: "unit" }, { header: "Price", key: "price" }, { header: "Currency", key: "currency" }, { header: "Active", key: "active" },
  ], prices.map((p) => ({ ...p, price: m(p.price, p.currency), active: p.active ? "yes" : "no" })));

  add("Activity", [{ header: "When", key: "at", width: 20 }, { header: "Action", key: "action", width: 22 }, { header: "Summary", key: "summary", width: 80 }], activity);

  const buf = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="homat-backup-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
