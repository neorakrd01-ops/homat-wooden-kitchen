"use server";

import { revalidatePath } from "next/cache";
import { db, logActivity } from "../db";
import { requireUser } from "../session";
import { str, type ActionState } from "../form";
import { SETTING_DEFAULTS, type Settings } from "../settings";

export async function saveSettings(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const keys = Object.keys(SETTING_DEFAULTS) as (keyof Settings)[];
  const values: Record<string, string> = {};
  for (const k of keys) values[k] = str(form, k, 1000);
  if (values.digits !== "eastern") values.digits = "western";
  const rate = Number(values.defaultRate.replace(/,/g, ""));
  if (values.defaultRate && (!Number.isFinite(rate) || rate <= 0)) return { error: "rate_required" };

  await db.$transaction(async (tx) => {
    for (const k of keys) {
      await tx.setting.upsert({ where: { key: k }, create: { key: k, value: values[k] }, update: { value: values[k] } });
    }
    await logActivity(tx, { action: "settings_saved", entity: "settings", entityId: "-", summary: "Settings saved", details: values });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
