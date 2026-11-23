import Link from "next/link";
import { db } from "@/lib/db";
import { getView } from "@/lib/view";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { t, date } = await getView();
  const q = ((await searchParams).q ?? "").trim();
  const customers = await db.customer.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { address: { contains: q } }] } : undefined,
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { _count: { select: { orders: true, quotes: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("nav_customers")}</h1>
        <Link href="/customers/new" className="btn btn-primary">+ {t("new_customer")}</Link>
      </div>
      <form className="flex gap-2">
        <input className="input" name="q" defaultValue={q} placeholder={t("search_customers")} />
        <button className="btn">{t("search")}</button>
      </form>
      <div className="card overflow-x-auto">
        {customers.length === 0 ? (
          <p className="text-sm text-stone-500">{t("no_results")}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("phone")}</th>
                <th>{t("address")}</th>
                <th>{t("nav_quotes")}</th>
                <th>{t("nav_orders")}</th>
                <th>{t("updated")}</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/customers/${c.id}`} className="font-medium text-wood-700 underline">{c.name}</Link></td>
                  <td className="num">{c.phone}</td>
                  <td>{c.address}</td>
                  <td>{c._count.quotes}</td>
                  <td>{c._count.orders}</td>
                  <td>{date(c.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
