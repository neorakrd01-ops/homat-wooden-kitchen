import { Suspense } from "react";
import { getT } from "@/lib/i18n";
import { LangSwitch } from "@/components/LangSwitch";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t, locale } = await getT();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-wood-700">{t("app_name")}</h1>
        <Suspense>
          <LangSwitch current={locale} />
        </Suspense>
      </div>
      <div className="card">{children}</div>
    </main>
  );
}
