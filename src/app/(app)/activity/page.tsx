import Link from "next/link";
import { db } from "@/lib/db";
import { getView } from "@/lib/view";

function linkFor(entity: string, id: string): string | null {
  if (entity === "order") return `/orders/${id}`;
  if (entity === "quote") return `/quotes/${id}`;
  if (entity === "customer") return `/customers/${id}`;
  return null;
}

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { t, date } = await getView();
  const type = (await searchParams).type;
  const money = type === "money";
  const entries = await db.activityLog.findMany({
    where: money ? { entity: { in: ["payment", "order"] } } : undefined,
    orderBy: { at: "desc" },
    take: 300,
  });
  const payments = await db.payment.findMany({ where: { id: { in: entries.filter((e) => e.entity === "payment").map((e) => e.entityId) } }, select: { id: true, orderId: true } });
  const payOrder = new Map(payments.map((p) => [p.id, p.orderId]));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("nav_activity")}</h1>
      <p className="text-sm text-stone-600">{t("activity_help")}</p>
      <div className="flex gap-2">
        <Link href="/activity" className={`btn !py-1 ${!money ? "!bg-wood-100" : ""}`}>{t("all")}</Link>
        <Link href="/activity?type=money" className={`btn !py-1 ${money ? "!bg-wood-100" : ""}`}>{t("money_only")}</Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>{t("date")}</th><th>{t("time")}</th><th>{t("what_happened")}</th></tr></thead>
          <tbody>
            {entries.map((e) => {
              const href = e.entity === "payment" ? (payOrder.get(e.entityId) ? `/orders/${payOrder.get(e.entityId)}` : null) : linkFor(e.entity, e.entityId);
              return (
                <tr key={e.id} className={e.action.includes("cancel") ? "text-red-700" : ""}>
                  <td className="whitespace-nowrap">{date(e.at)}</td>
                  <td className="num">{e.at.toLocaleTimeString("en-GB", { timeZone: "Asia/Baghdad", hour: "2-digit", minute: "2-digit" })}</td>
                  <td dir="auto">{href ? <Link className="underline" href={href}>{e.summary}</Link> : e.summary}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
