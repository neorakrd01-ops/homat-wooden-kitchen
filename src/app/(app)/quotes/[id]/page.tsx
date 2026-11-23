import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { editorLines, getView, linesText } from "@/lib/view";
import { acceptQuote, saveQuote, setQuoteStatus } from "@/lib/actions/quotes";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { LinesEditor } from "@/components/LinesEditor";
import { StatusBadge } from "@/components/StatusBadge";
import { ShareLinks } from "@/components/ShareLinks";
import { docNumber, lineTotal, sumLines, toMajor, type Currency } from "@/lib/money";
import type { Key } from "@/lib/i18n";

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, errors, money, date, locale } = await getView();
  const q = await db.quote.findUnique({
    where: { id },
    include: { customer: true, lines: { orderBy: { position: "asc" } }, order: true },
  });
  if (!q) notFound();
  const currency = q.currency as Currency;
  const editable = q.status === "DRAFT" || q.status === "SENT";
  const total = sumLines(q.lines) - q.discount;
  const num = docNumber("Q", q.number);

  const prices = editable
    ? (await db.priceItem.findMany({ where: { active: true, currency }, orderBy: { nameKu: "asc" } })).map((p) => ({
        id: p.id,
        label: locale === "en" ? p.nameEn || p.nameKu : p.nameKu,
        unit: p.unit,
        price: String(toMajor(p.price, currency)),
      }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">
            {t("quote")} {num} <StatusBadge status={q.status} label={t(`status_${q.status}` as Key)} />
          </h1>
          <p className="text-sm text-stone-600">
            <Link className="underline" href={`/customers/${q.customerId}`}>{q.customer.name}</Link> · {date(q.createdAt)} · {q.currency}
          </p>
        </div>
        {q.order && (
          <Link href={`/orders/${q.order.id}`} className="btn btn-primary">{t("go_to_order")} {docNumber("O", q.order.number)}</Link>
        )}
      </div>

      {editable ? (
        <ActionForm action={saveQuote} errors={errors} okText={t("saved")} className="card space-y-4">
          <input type="hidden" name="id" value={q.id} />
          <div>
            <label className="label">{t("title")}</label>
            <input className="input" name="title" defaultValue={q.title} placeholder={t("quote_title_placeholder")} />
          </div>
          <LinesEditor
            initial={editorLines(q.lines, currency)}
            initialDiscount={q.discount ? String(toMajor(q.discount, currency)) : ""}
            currency={currency}
            prices={prices}
            text={linesText(t)}
          />
          <div>
            <label className="label">{t("notes_on_quote")}</label>
            <textarea className="input" name="notes" rows={3} defaultValue={q.notes} />
          </div>
          <SubmitButton>{t("save")}</SubmitButton>
        </ActionForm>
      ) : (
        <section className="card overflow-x-auto">
          {q.title && <h2 className="mb-2 font-semibold">{q.title}</h2>}
          <table className="table">
            <thead>
              <tr><th>{t("line_description")}</th><th>{t("line_quantity")}</th><th>{t("line_unit_price")}</th><th>{t("line_total")}</th></tr>
            </thead>
            <tbody>
              {q.lines.map((l) => (
                <tr key={l.id}>
                  <td>{l.description}</td>
                  <td className="num">{l.quantity}</td>
                  <td className="num">{money(l.unitPrice, currency)}</td>
                  <td className="num">{money(lineTotal(l.quantity, l.unitPrice), currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 text-end">
            {q.discount > 0 && <div className="text-sm">{t("discount")}: <span className="num">{money(q.discount, currency)}</span></div>}
            <div className="text-lg font-bold">{t("total")}: <span className="num">{money(total, currency)}</span></div>
          </div>
          {q.notes && <p className="mt-2 text-sm whitespace-pre-wrap">{q.notes}</p>}
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="font-semibold">{t("share_quote")}</h2>
          <p className="text-xs text-stone-500">{t("share_help")}</p>
          <ShareLinks
            t={t}
            viewPath={`/doc/quote/${q.id}`}
            publicPath={`/s/q/${q.shareToken}`}
            phone={q.customer.phone}
            message={(link) => t("share_quote_message", { name: q.customer.name, number: num, link })}
          />
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">{t("quote_status")}</h2>
          {editable && (
            <ActionForm action={acceptQuote} errors={errors} className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-3">
              <input type="hidden" name="id" value={q.id} />
              <p className="text-sm">{t("accept_help", { total: money(total, currency) })}</p>
              <label className="label">{t("delivery_date")}</label>
              <input className="input" type="date" name="deliveryDate" />
              <SubmitButton className="btn btn-green" confirm={t("accept_confirm")}>{t("accept_quote")}</SubmitButton>
            </ActionForm>
          )}
          <div className="flex flex-wrap gap-2">
            {q.status === "DRAFT" && <StatusButton id={q.id} status="SENT" label={t("mark_sent")} />}
            {q.status === "SENT" && <StatusButton id={q.id} status="DRAFT" label={t("back_to_draft")} />}
            {editable && <StatusButton id={q.id} status="REJECTED" label={t("mark_rejected")} danger confirm={t("reject_confirm")} />}
            {q.status === "REJECTED" && <StatusButton id={q.id} status="DRAFT" label={t("reopen")} />}
          </div>
          {q.status === "ACCEPTED" && <p className="text-sm text-stone-600">{t("quote_accepted_help")}</p>}
        </section>
      </div>
    </div>
  );
}

function StatusButton({ id, status, label, danger, confirm }: { id: string; status: string; label: string; danger?: boolean; confirm?: string }) {
  return (
    <form action={setQuoteStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton className={danger ? "btn btn-danger" : "btn"} confirm={confirm}>{label}</SubmitButton>
    </form>
  );
}
