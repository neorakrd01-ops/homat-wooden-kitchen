import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { errorMessages } from "@/lib/errors";
import { loginAction } from "@/lib/auth-actions";
import { getSessionUserId } from "@/lib/session";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export default async function LoginPage() {
  const { t } = await getT();
  if (await getSessionUserId()) redirect("/");
  const ready = await db.user.findFirst({ where: { totpEnabled: true } });

  if (!ready) {
    return (
      <div className="space-y-3">
        <p>{t("setup_needed")}</p>
        <Link href="/setup" className="btn btn-primary">{t("setup_start")}</Link>
      </div>
    );
  }

  return (
    <ActionForm action={loginAction} errors={errorMessages(t)} className="space-y-4">
      <h2 className="text-lg font-semibold">{t("login_title")}</h2>
      <div>
        <label className="label" htmlFor="username">{t("username")}</label>
        <input className="input" id="username" name="username" autoComplete="username" dir="ltr" required />
      </div>
      <div>
        <label className="label" htmlFor="password">{t("password")}</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" dir="ltr" required />
      </div>
      <SubmitButton className="btn btn-primary w-full">{t("login_button")}</SubmitButton>
    </ActionForm>
  );
}
