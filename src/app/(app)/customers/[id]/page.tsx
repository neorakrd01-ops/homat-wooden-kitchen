import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getView } from "@/lib/view";
import { updateCustomer } from "@/lib/actions/customers";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { CustomerFields } from "@/components/CustomerFields";
import { StatusBadge } from "@/components/StatusBadge";
import { balanceOf } from "@/lib/orders";
import { docNumber, sumLines } from "@/lib/money";
import type { Key } from "@/lib/i18n";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, errors, money, date } = await getView();
  const c = await db.customer.findUnique({
    where: { id },
    include: {
      quotes: { orderBy: { createdAt: "desc" }, include: { lines: true } },
      orders: { orderBy: { createdAt: "desc" }, include: { payments: true } },
    },
  });
  if (!c) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{c.name}</h1>
        <Link href={`/quotes/new?customer=${c.id}`} className="btn btn-primary">+ {t("new_quote")}</Link>
      </div>

      <ActionForm action={updateCustomer} errors={errors} okText={t("saved")} className="card max-w-2xl space-y-4">
        <input type="hidden" name="id" value={c.id} />
        <CustomerFields t={t} c={c} />
        <SubmitButton>{t("save")}</SubmitButton>
      </ActionForm>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 font-semibold">{t("nav_orders")}</h2>
        {c.orders.length === 0 ? (
          <p className="text-sm text-stone-500">{t("no_results")}</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>{t("order")}</th><th>{t("title")}</th><th>{t("status")}</th><th>{t("total")}</th><th>{t("balance")}</th></tr>
            </thead>
            <tbody>
              {c.orders.map((o) => (
                <tr key={o.id}>
                  <td><Link className="underline" href={`/orders/${o.id}`}>{docNumber("O", o.number)}</Link></td>
                  <td>{o.title}</td>
                  <td><StatusBadge status={o.status} label={t(`status_${o.status}` as Key)} /></td>
                  <td className="num">{money(o.total, o.currency)}</td>
                  <td className="num">{money(balanceOf(o), o.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 font-semibold">{t("nav_quotes")}</h2>
        {c.quotes.length === 0 ? (
          <p className="text-sm text-stone-500">{t("no_results")}</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>{t("quote")}</th><th>{t("title")}</th><th>{t("status")}</th><th>{t("total")}</th><th>{t("date")}</th></tr>
            </thead>
            <tbody>
              {c.quotes.map((q) => (
                <tr key={q.id}>
                  <td><Link className="underline" href={`/quotes/${q.id}`}>{docNumber("Q", q.number)}</Link></td>
                  <td>{q.title}</td>
                  <td><StatusBadge status={q.status} label={t(`status_${q.status}` as Key)} /></td>
                  <td className="num">{money(sumLines(q.lines) - q.discount, q.currency)}</td>
                  <td>{date(q.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
