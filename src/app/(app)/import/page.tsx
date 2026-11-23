import { db } from "@/lib/db";
import { getView } from "@/lib/view";
import { importExcel, importOrder } from "@/lib/actions/imports";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export default async function ImportPage() {
  const { t, errors } = await getView();
  const customers = await db.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, phone: true } });
  const imported = await db.order.count({ where: { imported: true } });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("nav_import")}</h1>
        <p className="mt-1 text-sm text-stone-600">{t("import_help")}</p>
        <p className="mt-1 text-sm font-medium">{t("imported_count", { n: imported })}</p>
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold">{t("import_one")}</h2>
        <ActionForm action={importOrder} errors={errors} okText={t("import_one_ok")} resetOnOk className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">{t("customer")}</label>
              <select className="input" name="customerId" defaultValue="">
                <option value="">{t("import_new_customer")}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("new_customer_name")}</label>
              <input className="input" name="customerName" />
            </div>
            <div>
              <label className="label">{t("phone")}</label>
              <input className="input" name="phone" dir="ltr" inputMode="tel" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{t("title")}</label>
              <input className="input" name="title" placeholder={t("quote_title_placeholder")} />
            </div>
            <div>
              <label className="label">{t("currency")}</label>
              <select className="input" name="currency" defaultValue="IQD">
                <option>IQD</option>
                <option>USD</option>
              </select>
            </div>
            <div>
              <label className="label">{t("delivery_date")}</label>
              <input className="input" type="date" name="deliveryDate" />
            </div>
            <div>
              <label className="label">{t("agreed_total")} *</label>
              <input className="input" name="total" dir="ltr" inputMode="decimal" required />
            </div>
            <div>
              <label className="label">{t("already_paid")}</label>
              <input className="input" name="paid" dir="ltr" inputMode="decimal" defaultValue="0" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">{t("notes")}</label>
              <input className="input" name="notes" />
            </div>
          </div>
          <SubmitButton>{t("import_one_button")}</SubmitButton>
        </ActionForm>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">{t("import_excel")}</h2>
        <p className="text-sm text-stone-600">{t("import_excel_help")}</p>
        <a className="btn" href="/api/import-template">{t("download_template")}</a>
        <ActionForm action={importExcel} errors={errors} okText={t("import_excel_ok")} resetOnOk className="space-y-3">
          <input className="input" type="file" name="file" accept=".xlsx" required />
          <SubmitButton confirm={t("import_excel_confirm")}>{t("import_excel_button")}</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
