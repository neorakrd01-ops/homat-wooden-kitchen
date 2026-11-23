import Link from "next/link";
import { getT } from "@/lib/i18n";
import { errorMessages } from "@/lib/errors";
import { verifyAction } from "@/lib/auth-actions";
import { getPending } from "@/lib/session";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export default async function VerifyPage() {
  const { t } = await getT();
  if (!(await getPending("verify"))) {
    return (
      <div className="space-y-3">
        <p>{t("err_expired")}</p>
        <Link href="/login" className="btn">{t("back_to_login")}</Link>
      </div>
    );
  }
  return (
    <ActionForm action={verifyAction} errors={errorMessages(t)} className="space-y-4">
      <h2 className="text-lg font-semibold">{t("verify_title")}</h2>
      <p className="text-sm text-stone-600">{t("verify_help")}</p>
      <input
        className="input text-center text-lg tracking-widest"
        name="code"
        inputMode="text"
        autoComplete="one-time-code"
        dir="ltr"
        autoFocus
        required
      />
      <p className="text-xs text-stone-500">{t("verify_recovery_hint")}</p>
      <SubmitButton className="btn btn-primary w-full">{t("verify_button")}</SubmitButton>
    </ActionForm>
  );
}
