"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { setLanguageAction } from "@/lib/auth-actions";

export function LangSwitch({ current }: { current: string }) {
  const path = usePathname();
  const qs = useSearchParams().toString();
  return (
    <form action={setLanguageAction} className="flex gap-1">
      <input type="hidden" name="back" value={qs ? `${path}?${qs}` : path} />
      <button name="lang" value="ku" className={`btn !px-2 !py-1 ${current === "ku" ? "!bg-wood-100" : ""}`}>
        کوردی
      </button>
      <button name="lang" value="en" className={`btn !px-2 !py-1 ${current === "en" ? "!bg-wood-100" : ""}`}>
        English
      </button>
    </form>
  );
}
