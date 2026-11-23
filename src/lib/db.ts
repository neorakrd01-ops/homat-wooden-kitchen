import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/** Next running number for quotes, orders, payments (Q-0001, O-0001, R-0001). */
export async function nextNumber(tx: Tx, name: string): Promise<number> {
  const c = await tx.counter.upsert({
    where: { name },
    create: { name, value: 1 },
    update: { value: { increment: 1 } },
  });
  return c.value;
}

export async function logActivity(
  tx: Tx,
  entry: { action: string; entity: string; entityId: string; summary: string; details?: unknown },
) {
  await tx.activityLog.create({
    data: {
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      summary: entry.summary,
      details: JSON.stringify(entry.details ?? {}),
    },
  });
}
