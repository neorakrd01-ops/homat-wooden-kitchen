import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { editorLines, getView, linesText } from "@/lib/view";
import { cancelOrder, cancelPayment, recordPayment, reviseOrder, setOrderStatus, updateOrderInfo } from "@/lib/actions/orders";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { LinesEditor } from "@/components/LinesEditor";
import { PaymentFields } from "@/components/PaymentFields";
import { StatusBadge } from "@/components/StatusBadge";
import { balanceOf, normalizeWhatsAppPhone, paidNet } from "@/lib/orders";
import { dateInput, docNumber, lineTotal, toMajor, type Currency } from "@/lib/money";
import type { Key } from "@/lib/i18n";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, errors, money, date, locale, settings } = await getView();
  const o = await db.order.findUnique({
    where: { id },
    include: {
      customer: true,
      quote: true,
      lines: { orderBy: { position: "asc" } },
      revisions: { orderBy: { createdAt: "desc" } },
      payments: { orderBy: [{ date: "desc" }, { number: "desc" }] },
    },
  });
  if (!o) notFound();
  const currency = o.currency as Currency;
  const paid = paidNet(o.payments);
  const balance = balanceOf(o);
  const cancelled = o.status === "CANCELLED";
  const num = docNumber("O", o.number);
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const wa = normalizeWhatsAppPhone(o.customer.phone) ?? "";

  const prices = cancelled
    ? []
    : (await db.priceItem.findMany({ where: { active: true, currency }, orderBy: { nameKu: "asc" } })).map((p) => ({
        id: p.id,
        label: locale === "en" ? p.nameEn || p.nameKu : p.nameKu,
        unit: p.unit,
        price: String(toMajor(p.price, currency)),
      }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">
            {t("order")} {num} <StatusBadge status={o.status} label={t(`status_${o.status}` as Key)} />
            {o.imported && <span className="badge ms-2 bg-stone-100 text-stone-600">{t("imported")}</span>}
          </h1>
          <p className="text-sm text-stone-600">
            <Link className="underline" href={`/customers/${o.customerId}`}>{o.customer.name}</Link>
            {o.customer.phone && <span className="num"> · {o.customer.phone}</span>}
            {o.title && <> · {o.title}</>}
            {o.quote && <> · <Link className="underline" href={`/quotes/${o.quote.id}`}>{docNumber("Q", o.quote.number)}</Link></>}
          </p>
        </div>
      </div>

      {cancelled && (
        <div className="error">
          {t("order_cancelled_note", { date: date(o.cancelledAt), reason: o.cancelReason })}
          {paid > 0 && <div className="mt-1 font-semibold">{t("kept_by_factory", { amount: money(paid, currency) })}</div>}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="card"><div className="text-xs text-stone-500">{t("total")}</div><div className="num text-lg font-bold">{money(o.total, currency)}</div></div>
        <div className="card"><div className="text-xs text-stone-500">{t("paid")}</div><div className="num text-lg font-bold text-green-700">{money(paid, currency)}</div></div>
        <div className="card"><div className="text-xs text-stone-500">{t("balance")}</div><div className={`num text-lg font-bold ${balance > 0 ? "text-red-700" : ""}`}>{money(balance, currency)}</div></div>
      </div>

      {(!cancelled || paid > 0) && (
        <section className="card">
          <h2 className="mb-3 font-semibold">{cancelled ? t("record_refund") : t("record_payment")}</h2>
          <ActionForm action={recordPayment} errors={errors} okText={t("payment_saved")} resetOnOk className="space-y-3">
            <input type="hidden" name="orderId" value={o.id} />
            <PaymentFields
              orderCurrency={currency}
              defaultRate={settings.defaultRate}
              today={dateInput(new Date())}
              allowPayment={!cancelled}
              text={{
                kind: t("type"),
                payment: t("kind_PAYMENT"),
                refund: t("kind_REFUND"),
                amount: t("amount"),
                currency: t("currency"),
                rate: t("exchange_rate"),
                rateHelp: t("exchange_rate_help", { currency }),
                method: t("method"),
                cash: t("method_CASH"),
                transfer: t("method_TRANSFER"),
                card: t("method_CARD"),
                other: t("method_OTHER"),
                date: t("date"),
                note: t("notes"),
                converted: t("counts_as"),
              }}
            />
            <SubmitButton>{t("save_payment")}</SubmitButton>
          </ActionForm>
        </section>
      )}

      <section className="card overflow-x-auto">
        <h2 className="mb-3 font-semibold">{t("payments")}</h2>
        {o.payments.length === 0 ? (
          <p className="text-sm text-stone-500">{t("no_payments")}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("receipt")}</th><th>{t("date")}</th><th>{t("type")}</th><th>{t("amount")}</th>
                <th>{t("counts_as")}</th><th>{t("method")}</th><th>{t("notes")}</th><th />
              </tr>
            </thead>
            <tbody>
              {o.payments.map((p) => (
                <tr key={p.id} className={p.cancelled ? "bg-red-50/50" : ""}>
                  <td className="num">{docNumber("R", p.number)}</td>
                  <td>{date(p.date)}</td>
                  <td>{t(`kind_${p.kind}` as Key)}</td>
                  <td className={`num ${p.cancelled ? "line-through text-stone-400" : ""}`}>
                    {p.kind === "REFUND" ? "−" : ""}{money(p.amount, p.currency)}
                    {p.exchangeRate ? <div className="text-xs text-stone-500">@ {p.exchangeRate}</div> : null}
                  </td>
                  <td className={`num ${p.cancelled ? "line-through text-stone-400" : ""}`}>{money(p.amountInOrderCurrency, currency)}</td>
                  <td>{t(`method_${p.method}` as Key)}</td>
                  <td className="max-w-48 text-xs">
                    {p.note}
                    {p.cancelled && <div className="font-semibold text-red-700">{t("cancelled_reason", { reason: p.cancelReason })}</div>}
                  </td>
                  <td className="space-y-1 whitespace-nowrap">
                    <div className="flex gap-1">
                      <a className="btn !px-2 !py-1" href={`/doc/receipt/${p.id}?lang=${locale}`} target="_blank" rel="noreferrer">{t("view_print")}</a>
                      {!p.cancelled && (
                        <a
                          className="btn btn-green !px-2 !py-1"
                          target="_blank"
                          rel="noreferrer"
                          href={`https://wa.me/${wa}?text=${encodeURIComponent(
                            t("share_receipt_message", { name: o.customer.name, number: docNumber("R", p.number), link: `${base}/s/r/${p.shareToken}?lang=${locale}` }),
                          )}`}
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                    {!p.cancelled && (
                      <details>
                        <summary className="cursor-pointer text-xs text-red-700">{t("cancel_payment")}</summary>
                        <ActionForm action={cancelPayment} errors={errors} className="mt-1 space-y-1">
                          <input type="hidden" name="id" value={p.id} />
                          <input className="input !py-1" name="reason" placeholder={t("reason")} required />
                          <SubmitButton className="btn btn-danger !py-1" confirm={t("cancel_payment_confirm")}>{t("cancel_payment")}</SubmitButton>
                        </ActionForm>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 font-semibold">{t("order_items")}</h2>
        <table className="table">
          <thead>
            <tr><th>{t("line_description")}</th><th>{t("line_quantity")}</th><th>{t("line_unit_price")}</th><th>{t("line_total")}</th></tr>
          </thead>
          <tbody>
            {o.lines.map((l) => (
              <tr key={l.id}>
                <td>{l.description}</td>
                <td className="num">{l.quantity}</td>
                <td className="num">{money(l.unitPrice, currency)}</td>
                <td className="num">{money(lineTotal(l.quantity, l.unitPrice), currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {o.discount > 0 && <p className="mt-2 text-end text-sm">{t("discount")}: <span className="num">{money(o.discount, currency)}</span></p>}

        {!cancelled && (
          <details className="mt-4">
            <summary className="btn cursor-pointer">{t("change_order")}</summary>
            <ActionForm action={reviseOrder} errors={errors} okText={t("saved")} className="mt-3 space-y-3">
              <input type="hidden" name="id" value={o.id} />
              <LinesEditor
                initial={editorLines(o.lines, currency)}
                initialDiscount={o.discount ? String(toMajor(o.discount, currency)) : ""}
                currency={currency}
                prices={prices}
                text={linesText(t)}
              />
              <div>
                <label className="label">{t("change_reason")} *</label>
                <input className="input" name="reason" required placeholder={t("change_reason_placeholder")} />
              </div>
              <SubmitButton>{t("save_change")}</SubmitButton>
            </ActionForm>
          </details>
        )}
      </section>

      {o.revisions.length > 0 && (
        <section className="card overflow-x-auto">
          <h2 className="mb-3 font-semibold">{t("change_history")}</h2>
          <table className="table">
            <thead><tr><th>{t("date")}</th><th>{t("old_total")}</th><th>{t("new_total")}</th><th>{t("reason")}</th></tr></thead>
            <tbody>
              {o.revisions.map((r) => (
                <tr key={r.id}>
                  <td>{date(r.createdAt)}</td>
                  <td className="num">{money(r.oldTotal, currency)}</td>
                  <td className="num">{money(r.newTotal, currency)}</td>
                  <td>{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-semibold">{t("order_details")}</h2>
          <ActionForm action={updateOrderInfo} errors={errors} okText={t("saved")} className="space-y-3">
            <input type="hidden" name="id" value={o.id} />
            <div>
              <label className="label">{t("title")}</label>
              <input className="input" name="title" defaultValue={o.title} />
            </div>
            <div>
              <label className="label">{t("delivery_date")}</label>
              <input className="input" type="date" name="deliveryDate" defaultValue={dateInput(o.deliveryDate)} />
            </div>
            <div>
              <label className="label">{t("notes")}</label>
              <textarea className="input" name="notes" rows={3} defaultValue={o.notes} />
            </div>
            <SubmitButton>{t("save")}</SubmitButton>
          </ActionForm>
        </section>

        <section className="card space-y-3">
          <h2 className="font-semibold">{t("order_status")}</h2>
          {o.status === "ACTIVE" && (
            <form action={setOrderStatus}>
              <input type="hidden" name="id" value={o.id} />
              <input type="hidden" name="status" value="COMPLETED" />
              <SubmitButton className="btn btn-green">{t("mark_completed")}</SubmitButton>
            </form>
          )}
          {o.status === "COMPLETED" && (
            <form action={setOrderStatus}>
              <input type="hidden" name="id" value={o.id} />
              <input type="hidden" name="status" value="ACTIVE" />
              <SubmitButton className="btn">{t("reopen")}</SubmitButton>
            </form>
          )}
          {!cancelled && (
            <details>
              <summary className="cursor-pointer text-sm font-medium text-red-700">{t("cancel_order")}</summary>
              <ActionForm action={cancelOrder} errors={errors} className="mt-2 space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <input type="hidden" name="id" value={o.id} />
                <p className="text-sm">{t("cancel_order_help", { amount: money(paid, currency) })}</p>
                <input className="input" name="reason" placeholder={t("reason")} required />
                <SubmitButton className="btn btn-danger" confirm={t("cancel_order_confirm")}>{t("cancel_order")}</SubmitButton>
              </ActionForm>
            </details>
          )}
        </section>
      </div>
    </div>
  );
}
