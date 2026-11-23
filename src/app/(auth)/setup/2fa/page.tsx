import Link from "next/link";
import QRCode from "qrcode";
import { authenticator } from "otplib";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { errorMessages } from "@/lib/errors";
import { getPending } from "@/lib/session";
import { EnrollForm } from "./EnrollForm";

export default async function EnrollPage() {
  const { t } = await getT();
  const userId = await getPending("enroll");
  const user = userId ? await db.user.findUnique({ where: { id: userId } }) : null;
  // After the code is confirmed the page may re-render while the recovery codes are on screen,
  // so an enabled user with a valid enroll cookie still gets the same form (its state keeps the codes).
  if (!user?.totpSecret) {
    return (
      <div className="space-y-3">
        <p>{t("err_expired")}</p>
        <Link href="/setup" className="btn">{t("setup_start")}</Link>
      </div>
    );
  }
  const uri = authenticator.keyuri(user.username, "Homat", user.totpSecret);
  const qr = await QRCode.toDataURL(uri, { margin: 1, width: 220 });

  return (
    <EnrollForm
      qr={qr}
      secret={user.totpSecret}
      errors={errorMessages(t)}
      text={{
        title: t("enroll_title"),
        step1: t("enroll_step1"),
        step2: t("enroll_step2"),
        manual: t("enroll_manual"),
        verify: t("verify_button"),
        codesTitle: t("recovery_title"),
        codesHelp: t("recovery_help"),
        done: t("recovery_saved"),
      }}
    />
  );
}
