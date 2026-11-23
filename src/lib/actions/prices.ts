"use server";

import { revalidatePath } from "next/cache";
import { db, logActivity } from "../db";
import { requireUser } from "../session";
import { currencyOf, moneyField, str, type ActionState } from "../form";
import { formatMoney } from "../money";

export async function savePriceItem(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const id = str(form, "id");
  const currency = currencyOf(form);
  const data = {
    nameKu: str(form, "nameKu", 200),
    nameEn: str(form, "nameEn", 200),
    nameAr: str(form, "nameAr", 200),
    unit: str(form, "unit", 50),
    price: moneyField(form, "price", currency),
    currency,
    active: form.get("active") === "on",
  };
  if (!data.nameKu && !data.nameEn) return { error: "name_required" };
  if (!data.nameKu) data.nameKu = data.nameEn;
  if (!Number.isFinite(data.price) || data.price < 0) return { error: "amount_invalid" };

  await db.$transaction(async (tx) => {
    if (id) {
      const before = await tx.priceItem.findUnique({ where: { id } });
      if (!before) return;
      await tx.priceItem.update({ where: { id }, data });
      await logActivity(tx, {
        action: "price_updated",
        entity: "price",
        entityId: id,
        summary: `Price item updated: ${data.nameKu} ${formatMoney(before.price, before.currency)} → ${formatMoney(data.price, data.currency)}`,
        details: { before, after: data },
      });
    } else {
      const p = await tx.priceItem.create({ data });
      await logActivity(tx, { action: "price_created", entity: "price", entityId: p.id, summary: `Price item added: ${p.nameKu} ${formatMoney(p.price, p.currency)}`, details: data });
    }
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
