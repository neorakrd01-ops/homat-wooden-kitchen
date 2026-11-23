import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { errorMessages } from "@/lib/errors";
import { setupAction } from "@/lib/auth-actions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export default async function SetupPage() {
  const { t } = await getT();
  if (await db.user.findFirst({ where: { totpEnabled: true } })) redirect("/login");

  return (
    <ActionForm action={setupAction} errors={errorMessages(t)} className="space-y-4">
      <h2 className="text-lg font-semibold">{t("setup_title")}</h2>
      <p className="text-sm text-stone-600">{t("setup_help")}</p>
      <div>
        <label className="label">{t("setup_key")}</label>
        <input className="input" name="setupKey" type="password" dir="ltr" required />
      </div>
      <div>
        <label className="label">{t("username")}</label>
        <input className="input" name="username" autoComplete="username" dir="ltr" required />
      </div>
      <div>
        <label className="label">{t("password")}</label>
        <input className="input" name="password" type="password" autoComplete="new-password" dir="ltr" minLength={10} required />
        <p className="mt-1 text-xs text-stone-500">{t("password_rule")}</p>
      </div>
      <div>
        <label className="label">{t("password_confirm")}</label>
        <input className="input" name="confirm" type="password" autoComplete="new-password" dir="ltr" required />
      </div>
      <SubmitButton className="btn btn-primary w-full">{t("continue")}</SubmitButton>
    </ActionForm>
  );
}
