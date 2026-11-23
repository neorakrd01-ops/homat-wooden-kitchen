import { getView } from "@/lib/view";
import { saveSettings } from "@/lib/actions/settings";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export default async function SettingsPage() {
  const { t, errors, settings: s } = await getView();
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{t("nav_settings")}</h1>
      <ActionForm action={saveSettings} errors={errors} okText={t("saved")} className="card space-y-4">
        <h2 className="font-semibold">{t("company_info")}</h2>
        <p className="text-xs text-stone-500">{t("company_info_help")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">{t("company_name")} (کوردی)</label><input className="input" name="companyNameKu" defaultValue={s.companyNameKu} /></div>
          <div><label className="label">{t("company_name")} (English)</label><input className="input" name="companyNameEn" defaultValue={s.companyNameEn} dir="ltr" /></div>
          <div><label className="label">{t("company_name")} (عربي)</label><input className="input" name="companyNameAr" defaultValue={s.companyNameAr} /></div>
          <div><label className="label">{t("phone")}</label><input className="input" name="companyPhone" defaultValue={s.companyPhone} dir="ltr" /></div>
          <div className="sm:col-span-2"><label className="label">{t("address")}</label><input className="input" name="companyAddress" defaultValue={s.companyAddress} /></div>
          <div className="sm:col-span-2"><label className="label">{t("quote_footer")}</label><textarea className="input" name="quoteFooter" rows={3} defaultValue={s.quoteFooter} placeholder={t("quote_footer_placeholder")} /></div>
        </div>
        <h2 className="pt-2 font-semibold">{t("money_settings")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t("default_rate")}</label>
            <input className="input" name="defaultRate" defaultValue={s.defaultRate} dir="ltr" inputMode="decimal" />
            <p className="mt-1 text-xs text-stone-500">{t("default_rate_help")}</p>
          </div>
          <div>
            <label className="label">{t("digits")}</label>
            <select className="input" name="digits" defaultValue={s.digits}>
              <option value="western">0123456789</option>
              <option value="eastern">٠١٢٣٤٥٦٧٨٩</option>
            </select>
          </div>
        </div>
        <SubmitButton>{t("save")}</SubmitButton>
      </ActionForm>
    </div>
  );
}
