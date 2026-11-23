import { dirOf, makeT, type DocLocale, type Key } from "@/lib/i18n";
import { companyName, type Settings } from "@/lib/settings";
import { docNumber, formatDate, formatMoney, lineTotal, sumLines } from "@/lib/money";
import { PrintButton } from "./PrintButton";

type Line = { id: string; description: string; quantity: number; unitPrice: number };

function Header({ s, lang, title, number, date }: { s: Settings; lang: DocLocale; title: string; number: string; date: string }) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4 border-b-2 border-wood-600 pb-4">
      <div>
        <div className="text-2xl font-bold text-wood-700">{companyName(s, lang)}</div>
        {s.companyAddress && <div className="text-sm text-stone-600">{s.companyAddress}</div>}
        {s.companyPhone && <div className="num text-sm text-stone-600">{s.companyPhone}</div>}
      </div>
      <div className="text-end">
        <div className="text-xl font-bold">{title}</div>
        <div className="num text-sm">{number}</div>
        <div className="text-sm">{date}</div>
      </div>
    </header>
  );
}

function Shell({ lang, children, printLabel }: { lang: DocLocale; children: React.ReactNode; printLabel: string }) {
  return (
    <div dir={dirOf(lang)} lang={lang} className="min-h-screen bg-stone-100 py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-end px-4">
        <PrintButton label={printLabel} />
      </div>
      <article className="mx-auto max-w-[210mm] bg-white p-8 shadow print:max-w-none print:p-0 print:shadow-none">{children}</article>
    </div>
  );
}

export function QuoteDocument({
  lang,
  s,
  quote,
}: {
  lang: DocLocale;
  s: Settings;
  quote: { number: number; title: string; currency: string; discount: number; notes: string; createdAt: Date; lines: Line[]; customer: { name: string; phone: string; address: string } };
}) {
  const t = makeT(lang);
  const d = s.digits;
  const subtotal = sumLines(quote.lines);
  return (
    <Shell lang={lang} printLabel={t("print_save_pdf")}>
      <Header s={s} lang={lang} title={t("doc_quote")} number={docNumber("Q", quote.number)} date={formatDate(quote.createdAt, d)} />
      <section className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="font-semibold text-stone-500">{t("doc_to")}</div>
          <div className="text-base font-semibold">{quote.customer.name}</div>
          {quote.customer.phone && <div className="num">{quote.customer.phone}</div>}
          {quote.customer.address && <div>{quote.customer.address}</div>}
        </div>
        {quote.title && (
          <div>
            <div className="font-semibold text-stone-500">{t("title")}</div>
            <div className="text-base">{quote.title}</div>
          </div>
        )}
      </section>
      <table className="table mb-4">
        <thead>
          <tr className="bg-wood-50">
            <th>#</th>
            <th>{t("line_description")}</th>
            <th>{t("line_quantity")}</th>
            <th>{t("line_unit_price")}</th>
            <th>{t("line_total")}</th>
          </tr>
        </thead>
        <tbody>
          {quote.lines.map((l, i) => (
            <tr key={l.id}>
              <td className="num">{i + 1}</td>
              <td>{l.description}</td>
              <td className="num">{l.quantity}</td>
              <td className="num">{formatMoney(l.unitPrice, quote.currency, d)}</td>
              <td className="num">{formatMoney(lineTotal(l.quantity, l.unitPrice), quote.currency, d)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ms-auto w-64 space-y-1 text-sm">
        {quote.discount > 0 && (
          <>
            <div className="flex justify-between"><span>{t("subtotal")}</span><span className="num">{formatMoney(subtotal, quote.currency, d)}</span></div>
            <div className="flex justify-between"><span>{t("discount")}</span><span className="num">− {formatMoney(quote.discount, quote.currency, d)}</span></div>
          </>
        )}
        <div className="flex justify-between border-t-2 border-wood-600 pt-1 text-lg font-bold">
          <span>{t("total")}</span>
          <span className="num">{formatMoney(subtotal - quote.discount, quote.currency, d)}</span>
        </div>
      </div>
      {quote.notes && <p className="mt-6 text-sm whitespace-pre-wrap">{quote.notes}</p>}
      {s.quoteFooter && <footer className="mt-10 border-t pt-3 text-xs whitespace-pre-wrap text-stone-600">{s.quoteFooter}</footer>}
    </Shell>
  );
}

export function ReceiptDocument({
  lang,
  s,
  payment,
  order,
  paidSoFar,
  balance,
}: {
  lang: DocLocale;
  s: Settings;
  payment: { number: number; kind: string; amount: number; currency: string; exchangeRate: number | null; amountInOrderCurrency: number; method: string; date: Date; note: string; cancelled: boolean };
  order: { number: number; title: string; currency: string; total: number; customer: { name: string; phone: string } };
  paidSoFar: number;
  balance: number;
}) {
  const t = makeT(lang);
  const d = s.digits;
  const refund = payment.kind === "REFUND";
  return (
    <Shell lang={lang} printLabel={t("print_save_pdf")}>
      <Header s={s} lang={lang} title={refund ? t("doc_refund") : t("doc_receipt")} number={docNumber("R", payment.number)} date={formatDate(payment.date, d)} />
      {payment.cancelled && <div className="mb-4 rounded border-2 border-red-600 p-2 text-center text-lg font-bold text-red-700">{t("doc_cancelled")}</div>}
      <p className="mb-4 text-base">
        {refund ? t("doc_refund_line", { name: order.customer.name }) : t("doc_received_from", { name: order.customer.name })}
      </p>
      <div className="mb-6 rounded-lg border-2 border-wood-600 p-4 text-center">
        <div className="num block text-3xl font-bold">{formatMoney(payment.amount, payment.currency, d)}</div>
        {payment.exchangeRate && (
          <div className="mt-1 text-sm">
            {t("doc_rate_line", { rate: String(payment.exchangeRate) })}{" "}
            <span className="num">{formatMoney(payment.amountInOrderCurrency, order.currency, d)}</span>
          </div>
        )}
      </div>
      <table className="table mb-4">
        <tbody>
          <tr><td className="font-semibold">{t("order")}</td><td className="num">{docNumber("O", order.number)}{order.title ? ` — ${order.title}` : ""}</td></tr>
          <tr><td className="font-semibold">{t("method")}</td><td>{t(`method_${payment.method}` as Key)}</td></tr>
          <tr><td className="font-semibold">{t("order_total")}</td><td className="num">{formatMoney(order.total, order.currency, d)}</td></tr>
          <tr><td className="font-semibold">{t("paid_so_far")}</td><td className="num">{formatMoney(paidSoFar, order.currency, d)}</td></tr>
          <tr><td className="font-semibold">{t("balance")}</td><td className="num font-bold">{formatMoney(balance, order.currency, d)}</td></tr>
          {payment.note && <tr><td className="font-semibold">{t("notes")}</td><td>{payment.note}</td></tr>}
        </tbody>
      </table>
      <div className="mt-16 grid grid-cols-2 gap-8 text-sm">
        <div className="border-t pt-2 text-center">{t("doc_signature_factory")}</div>
        <div className="border-t pt-2 text-center">{t("doc_signature_customer")}</div>
      </div>
    </Shell>
  );
}
