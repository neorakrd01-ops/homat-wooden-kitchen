"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, logActivity } from "../db";
import { requireUser } from "../session";
import { str, type ActionState } from "../form";

function fields(form: FormData) {
  return {
    name: str(form, "name", 200),
    phone: str(form, "phone", 50),
    address: str(form, "address", 500),
    notes: str(form, "notes", 2000),
  };
}

export async function createCustomer(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const data = fields(form);
  if (!data.name) return { error: "name_required" };
  const c = await db.$transaction(async (tx) => {
    const c = await tx.customer.create({ data });
    await logActivity(tx, { action: "customer_created", entity: "customer", entityId: c.id, summary: `Customer created: ${c.name}`, details: data });
    return c;
  });
  const back = str(form, "next");
  if (back === "quote") redirect(`/quotes/new?customer=${c.id}`);
  redirect(`/customers/${c.id}`);
}

export async function updateCustomer(_: ActionState, form: FormData): Promise<ActionState> {
  await requireUser();
  const id = str(form, "id");
  const data = fields(form);
  if (!data.name) return { error: "name_required" };
  const before = await db.customer.findUnique({ where: { id } });
  if (!before) return { error: "not_found" };
  await db.$transaction(async (tx) => {
    await tx.customer.update({ where: { id }, data });
    await logActivity(tx, {
      action: "customer_updated",
      entity: "customer",
      entityId: id,
      summary: `Customer updated: ${data.name}`,
      details: { before: { name: before.name, phone: before.phone, address: before.address, notes: before.notes }, after: data },
    });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
