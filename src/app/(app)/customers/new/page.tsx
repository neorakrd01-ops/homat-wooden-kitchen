import { getView } from "@/lib/view";
import { createCustomer } from "@/lib/actions/customers";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { CustomerFields } from "@/components/CustomerFields";

export default async function NewCustomerPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { t, errors } = await getView();
  const next = (await searchParams).next === "quote" ? "quote" : "";
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{t("new_customer")}</h1>
      {next && <p className="notice">{t("new_quote_pick_customer")}</p>}
      <ActionForm action={createCustomer} errors={errors} className="card space-y-4">
        <input type="hidden" name="next" value={next} />
        <CustomerFields t={t} />
        <SubmitButton>{next ? t("save_and_quote") : t("save")}</SubmitButton>
      </ActionForm>
    </div>
  );
}
