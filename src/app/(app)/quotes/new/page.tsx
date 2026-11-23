import Link from "next/link";
import { db } from "@/lib/db";
import { getView } from "@/lib/view";
import { createQuote } from "@/lib/actions/quotes";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const { t, errors } = await getView();
  const selected = (await searchParams).customer ?? "";
  const customers = await db.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, phone: true } });

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">{t("new_quote")}</h1>
      <ActionForm action={createQuote} errors={errors} className="card space-y-4">
        <div>
          <label className="label">{t("customer")} *</label>
          <select className="input" name="customerId" defaultValue={selected} required>
            <option value="">—</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.phone ? ` — ${c.phone}` : ""}
              </option>
            ))}
          </select>
          <Link href="/customers/new?next=quote" className="mt-1 inline-block text-sm text-wood-700 underline">
            + {t("new_customer")}
          </Link>
        </div>
        <div>
          <label className="label">{t("title")}</label>
          <input className="input" name="title" placeholder={t("quote_title_placeholder")} />
        </div>
        <div>
          <label className="label">{t("currency")}</label>
          <select className="input" name="currency" defaultValue="IQD">
            <option value="IQD">IQD</option>
            <option value="USD">USD</option>
          </select>
          <p className="mt-1 text-xs text-stone-500">{t("currency_help")}</p>
        </div>
        <SubmitButton>{t("create_quote")}</SubmitButton>
      </ActionForm>
    </div>
  );
}
