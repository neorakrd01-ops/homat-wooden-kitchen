import Link from "next/link";
import { db } from "@/lib/db";
import { getView } from "@/lib/view";
import { StatusBadge } from "@/components/StatusBadge";
import { docNumber, sumLines } from "@/lib/money";
import type { Key } from "@/lib/i18n";

const STATUSES = ["DRAFT", "SENT", "ACCEPTED", "REJECTED"];

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { t, money, date } = await getView();
  const status = (await searchParams).status;
  const quotes = await db.quote.findMany({
    where: status && STATUSES.includes(status) ? { status } : undefined,
    orderBy: { number: "desc" },
    take: 300,
    include: { customer: true, lines: true },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("nav_quotes")}</h1>
        <Link href="/quotes/new" className="btn btn-primary">+ {t("new_quote")}</Link>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/quotes" className={`btn !py-1 ${!status ? "!bg-wood-100" : ""}`}>{t("all")}</Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/quotes?status=${s}`} className={`btn !py-1 ${status === s ? "!bg-wood-100" : ""}`}>
            {t(`status_${s}` as Key)}
          </Link>
        ))}
      </div>
      <div className="card overflow-x-auto">
        {quotes.length === 0 ? (
          <p className="text-sm text-stone-500">{t("no_results")}</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>{t("quote")}</th><th>{t("customer")}</th><th>{t("title")}</th><th>{t("status")}</th><th>{t("total")}</th><th>{t("date")}</th></tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td><Link className="font-medium text-wood-700 underline" href={`/quotes/${q.id}`}>{docNumber("Q", q.number)}</Link></td>
                  <td>{q.customer.name}</td>
                  <td>{q.title}</td>
                  <td><StatusBadge status={q.status} label={t(`status_${q.status}` as Key)} /></td>
                  <td className="num">{money(sumLines(q.lines) - q.discount, q.currency)}</td>
                  <td>{date(q.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
