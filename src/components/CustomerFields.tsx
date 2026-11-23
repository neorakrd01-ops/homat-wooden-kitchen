import type { T } from "@/lib/i18n";

export function CustomerFields({ t, c }: { t: T; c?: { name: string; phone: string; address: string; notes: string } }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label">{t("name")} *</label>
        <input className="input" name="name" defaultValue={c?.name} required />
      </div>
      <div>
        <label className="label">{t("phone")}</label>
        <input className="input" name="phone" defaultValue={c?.phone} dir="ltr" inputMode="tel" placeholder="0750 123 4567" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">{t("address")}</label>
        <input className="input" name="address" defaultValue={c?.address} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">{t("notes")}</label>
        <textarea className="input" name="notes" rows={3} defaultValue={c?.notes} />
      </div>
    </div>
  );
}
