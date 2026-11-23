import Link from "next/link";
import { db } from "@/lib/db";
import { getView } from "@/lib/view";
import { balanceOf, paidNet } from "@/lib/orders";
import { docNumber, startOfIraqDay, startOfIraqMonth } from "@/lib/money";
import type { Key } from "@/lib/i18n";

export default async function Dashboard() {
  const { t, money, date } = await getView();

  const orders = await db.order.findMany({
    where: { status: { not: "CANCELLED" } },
    include: { customer: true, payments: true },
  });
  const owed: Record<string, number> = { IQD: 0, USD: 0 };
  const unpaid = orders
    .map((o) => ({ o, balance: balanceOf(o), paid: paidNet(o.payments) }))
    .filter((x) => x.balance > 0)
    .sort((a, b) => (a.o.deliveryDate?.getTime() ?? Infinity) - (b.o.deliveryDate?.getTime() ?? Infinity));
  for (const x of unpaid) owed[x.o.currency] += x.balance;

  const monthStart = startOfIraqMonth();
  const today = startOfIraqDay();
  const monthPayments = await db.payment.findMany({ where: { cancelled: false, date: { gte: monthStart }, kind: { not: "OPENING" } } });
  const received: Record<string, number> = { IQD: 0, USD: 0 };
  for (const p of monthPayments) received[p.currency] += p.kind === "REFUND" ? -p.amount : p.amount;

  const recent = await db.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { order: { include: { customer: true } } },
  });

  const activeCount = orders.filter((o) => o.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("nav_dashboard")}</h1>
        <div className="flex gap-2">
          <Link href="/quotes/new" className="btn btn-primary">+ {t("new_quote")}</Link>
          <Link href="/customers/new" className="btn">+ {t("new_customer")}</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("owed_iqd")} value={money(owed.IQD, "IQD")} strong />
        <Stat label={t("owed_usd")} value={money(owed.USD, "USD")} strong />
        <Stat label={t("received_this_month")} value={`${money(received.IQD, "IQD")} · ${money(received.USD, "USD")}`} />
        <Stat label={t("active_orders")} value={String(activeCount)} />
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold">{t("unpaid_orders")} ({unpaid.length})</h2>
        {unpaid.length === 0 ? (
          <p className="text-sm text-stone-500">{t("nothing_owed")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("order")}</th>
                  <th>{t("customer")}</th>
                  <th>{t("total")}</th>
                  <th>{t("paid")}</th>
                  <th>{t("balance")}</th>
                  <th>{t("delivery_date")}</th>
                </tr>
              </thead>
              <tbody>
                {unpaid.map(({ o, balance, paid }) => {
                  const late = o.deliveryDate && o.deliveryDate < today;
                  return (
                    <tr key={o.id}>
                      <td><Link className="text-wood-700 underline" href={`/orders/${o.id}`}>{docNumber("O", o.number)}</Link></td>
                      <td>{o.customer.name}{o.title ? <div className="text-xs text-stone-500">{o.title}</div> : null}</td>
                      <td className="num">{money(o.total, o.currency)}</td>
                      <td className="num">{money(paid, o.currency)}</td>
                      <td className="num font-semibold text-red-700">{money(balance, o.currency)}</td>
                      <td className={late ? "font-semibold text-red-700" : ""}>{date(o.deliveryDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">{t("recent_payments")}</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-stone-500">{t("no_payments")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("date")}</th>
                  <th>{t("receipt")}</th>
                  <th>{t("customer")}</th>
                  <th>{t("type")}</th>
                  <th>{t("amount")}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id} className={p.cancelled ? "text-stone-400 line-through" : ""}>
                    <td>{date(p.date)}</td>
                    <td><Link className="underline" href={`/orders/${p.orderId}`}>{docNumber("R", p.number)}</Link></td>
                    <td>{p.order.customer.name}</td>
                    <td>{t(`kind_${p.kind}` as Key)}</td>
                    <td className="num">{p.kind === "REFUND" ? "−" : ""}{money(p.amount, p.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="card">
      <div className="text-xs text-stone-500">{label}</div>
      <div className={`num mt-1 block ${strong ? "text-xl font-bold text-red-700" : "text-lg font-semibold"}`}>{value}</div>
    </div>
  );
}
