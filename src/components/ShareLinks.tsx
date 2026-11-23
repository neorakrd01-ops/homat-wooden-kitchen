import type { T } from "@/lib/i18n";
import { normalizeWhatsAppPhone } from "@/lib/orders";

/** Document view + WhatsApp share buttons for each document language. */
export function ShareLinks({
  t,
  viewPath,
  publicPath,
  phone,
  message,
}: {
  t: T;
  viewPath: string; // e.g. /doc/quote/abc
  publicPath: string; // e.g. /s/q/token
  phone: string;
  message: (link: string) => string;
}) {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const wa = normalizeWhatsAppPhone(phone);
  const langs = [
    { code: "ku", label: "کوردی" },
    { code: "en", label: "English" },
    { code: "ar", label: "عربي" },
  ];
  return (
    <div className="space-y-2">
      {langs.map((l) => {
        const link = `${base}${publicPath}?lang=${l.code}`;
        const href = `https://wa.me/${wa ?? ""}?text=${encodeURIComponent(message(link))}`;
        return (
          <div key={l.code} className="flex flex-wrap items-center gap-2">
            <span className="w-16 text-sm font-medium">{l.label}</span>
            <a className="btn !py-1" href={`${viewPath}?lang=${l.code}`} target="_blank" rel="noreferrer">
              {t("view_print")}
            </a>
            <a className="btn btn-green !py-1" href={href} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </div>
        );
      })}
      {!wa && <p className="text-xs text-stone-500">{t("no_phone_whatsapp")}</p>}
    </div>
  );
}
