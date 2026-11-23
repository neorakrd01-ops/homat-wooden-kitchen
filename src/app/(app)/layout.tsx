import { Suspense } from "react";
import { getT } from "@/lib/i18n";
import { requireUser } from "@/lib/session";
import { logoutAction } from "@/lib/auth-actions";
import { LangSwitch } from "@/components/LangSwitch";
import { NavLinks } from "@/components/NavLinks";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const { t, locale } = await getT();
  const items = [
    { href: "/", label: t("nav_dashboard") },
    { href: "/customers", label: t("nav_customers") },
    { href: "/quotes", label: t("nav_quotes") },
    { href: "/orders", label: t("nav_orders") },
    { href: "/prices", label: t("nav_prices") },
    { href: "/import", label: t("nav_import") },
    { href: "/activity", label: t("nav_activity") },
    { href: "/settings", label: t("nav_settings") },
  ];
  return (
    <div className="md:flex">
      <aside className="no-print border-b border-stone-200 bg-white p-3 md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-e md:border-b-0">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-lg font-bold text-wood-700">{t("app_name")}</span>
          <form action={logoutAction} className="md:hidden">
            <button className="btn !px-2 !py-1">{t("logout")}</button>
          </form>
        </div>
        <NavLinks items={items} />
        <div className="mt-4 hidden space-y-2 md:block">
          <Suspense>
            <LangSwitch current={locale} />
          </Suspense>
          <a href="/api/export" className="btn w-full">{t("backup_download")}</a>
          <form action={logoutAction}>
            <button className="btn w-full">{t("logout")}</button>
          </form>
        </div>
        <div className="mt-2 flex gap-2 md:hidden">
          <Suspense>
            <LangSwitch current={locale} />
          </Suspense>
          <a href="/api/export" className="btn !px-2 !py-1">{t("backup_download")}</a>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
