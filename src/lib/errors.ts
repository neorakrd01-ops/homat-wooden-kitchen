import type { T } from "./i18n";
import { en, type Key } from "./i18n/en";

/** All translated error messages (keys starting with "err_"), for ActionForm. */
export function errorMessages(t: T): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(en) as Key[]) {
    if (k.startsWith("err_")) out[k.slice(4)] = t(k);
  }
  return out;
}
