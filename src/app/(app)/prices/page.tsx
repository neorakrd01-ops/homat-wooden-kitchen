import { db } from "@/lib/db";
import { getView } from "@/lib/view";
import { savePriceItem } from "@/lib/actions/prices";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { toMajor, type Currency } from "@/lib/money";
import type { T } from "@/lib/i18n";

type Item = { id: string; nameKu: string; nameEn: string; nameAr: string; unit: string; price: number; currency: string; active: boolean };

function ItemFields({ t, item }: { t: T; item?: Item }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
      <input className="input lg:col-span-2" name="nameKu" defaultValue={item?.nameKu} placeholder={t("name_ku")} />
      <input className="input" name="nameEn" defaultValue={item?.nameEn} placeholder={t("name_en")} dir="ltr" />
      <input className="input" name="nameAr" defaultValue={item?.nameAr} placeholder={t("name_ar")} />
      <input className="input" name="unit" defaultValue={item?.unit} placeholder={t("unit_placeholder")} />
      <div className="flex gap-1">
        <input className="input" name="price" defaultValue={item ? String(toMajor(item.price, item.currency as Currency)) : ""} placeholder={t("price")} dir="ltr" inputMode="decimal" required />
        <select className="input !w-20" name="currency" defaultValue={item?.currency ?? "IQD"}>
          <option>IQD</option>
          <option>USD</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" name="active" defaultChecked={item ? item.active : true} /> {t("active")}
        </label>
        <SubmitButton className="btn btn-primary !py-1">{t("save")}</SubmitButton>
      </div>
    </div>
  );
}

export default async function PricesPage() {
  const { t, errors } = await getView();
  const items = await db.priceItem.findMany({ orderBy: [{ active: "desc" }, { nameKu: "asc" }] });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("nav_prices")}</h1>
      <p className="text-sm text-stone-600">{t("prices_help")}</p>

      <section className="card">
        <h2 className="mb-2 font-semibold">{t("price_add")}</h2>
        <ActionForm action={savePriceItem} errors={errors} okText={t("saved")} resetOnOk>
          <ItemFields t={t} />
        </ActionForm>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">{t("price_items")} ({items.length})</h2>
        {items.length === 0 && <p className="text-sm text-stone-500">{t("no_results")}</p>}
        {items.map((it) => (
          <ActionForm key={it.id} action={savePriceItem} errors={errors} okText={t("saved")} className={`border-b border-stone-100 pb-3 ${it.active ? "" : "opacity-60"}`}>
            <input type="hidden" name="id" value={it.id} />
            <ItemFields t={t} item={it} />
          </ActionForm>
        ))}
      </section>
    </div>
  );
}
