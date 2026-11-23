import Link from "next/link";
import { db } from "@/lib/db";
import { getView } from "@/lib/view";
import { StatusBadge } from "@/components/StatusBadge";
import { balanceOf, paidNet } from "@/lib/orders";
import { docNumber } from "@/lib/money";
import type { Key } from "@/lib/i18n";

const STATUSES = ["ACTIVE", "COMPLETED", "CANCELLED"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { t, money, date } = await getView();
  const sp = await searchParams;
  const status = sp.status && STATUSES.includes(sp.status) ? sp.status : sp.status === "all" ? undefined : "ACTIVE";
  const q = (sp.q ?? "").trim();
  const orders = await db.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ title: { contains: q } }, { customer: { name: { contains: q } } }, { customer: { phone: { contains: q } } }] } : {}),
    },
    orderBy: { number: "desc" },
    take: 300,
    include: { customer: true, payments: true },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("nav_orders")}</h1>
        <Link href="/quotes/new" className="btn btn-primary">+ {t("new_quote")}</Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link key={s} href={`/orders?status=${s}`} className={`btn !py-1 ${status === s ? "!bg-wood-100" : ""}`}>{t(`status_${s}` as Key)}</Link>
        ))}
        <Link href="/orders?status=all" className={`btn !py-1 ${!status ? "!bg-wood-100" : ""}`}>{t("all")}</Link>
        <form className="flex gap-1">
          <input type="hidden" name="status" value={status ?? "all"} />
          <input className="input !py-1" name="q" defaultValue={q} placeholder={t("search")} />
        </form>
      </div>
      <div className="card overflow-x-auto">
        {orders.length === 0 ? (
          <p className="text-sm text-stone-500">{t("no_results")}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("order")}</th><th>{t("customer")}</th><th>{t("status")}</th><th>{t("total")}</th>
                <th>{t("paid")}</th><th>{t("balance")}</th><th>{t("delivery_date")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const bal = balanceOf(o);
                return (
                  <tr key={o.id}>
                    <td><Link className="font-medium text-wood-700 underline" href={`/orders/${o.id}`}>{docNumber("O", o.number)}</Link></td>
                    <td>{o.customer.name}{o.title ? <div className="text-xs text-stone-500">{o.title}</div> : null}</td>
                    <td><StatusBadge status={o.status} label={t(`status_${o.status}` as Key)} /></td>
                    <td className="num">{money(o.total, o.currency)}</td>
                    <td className="num">{money(paidNet(o.payments), o.currency)}</td>
                    <td className={`num ${bal > 0 ? "font-semibold text-red-700" : ""}`}>{money(bal, o.currency)}</td>
                    <td>{date(o.deliveryDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
