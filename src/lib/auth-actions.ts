"use server";

import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { randomBytes, timingSafeEqual } from "crypto";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "./db";
import { createSession, destroySession, getPending, setPending } from "./session";
import { LANG_COOKIE } from "./i18n";

authenticator.options = { window: 1 };

export type FormState = { error?: string; ok?: boolean; codes?: string[] } | undefined;

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

async function registerFailure(userId: string, attempts: number) {
  const next = attempts + 1;
  await db.user.update({
    where: { id: userId },
    data:
      next >= MAX_ATTEMPTS
        ? { failedAttempts: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
        : { failedAttempts: next },
  });
}

// ---------- First-time setup ----------

export async function setupAction(_: FormState, form: FormData): Promise<FormState> {
  const key = String(form.get("setupKey") ?? "");
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  const expected = process.env.SETUP_KEY ?? "";
  if (!expected || !safeEqual(key, expected)) return { error: "setup_key_wrong" };
  if (await db.user.findFirst({ where: { totpEnabled: true } })) return { error: "setup_done" };
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) return { error: "username_invalid" };
  if (password.length < 10) return { error: "password_short" };
  if (password !== confirm) return { error: "password_mismatch" };

  await db.user.deleteMany({ where: { totpEnabled: false } });
  const user = await db.user.create({
    data: {
      username,
      passwordHash: await bcrypt.hash(password, 12),
      totpSecret: authenticator.generateSecret(),
    },
  });
  await setPending(user.id, "enroll");
  redirect("/setup/2fa");
}

function makeRecoveryCodes(): string[] {
  return Array.from({ length: 8 }, () => {
    const hex = randomBytes(5).toString("hex").toUpperCase();
    return `${hex.slice(0, 5)}-${hex.slice(5)}`;
  });
}

export async function enrollAction(_: FormState, form: FormData): Promise<FormState> {
  const userId = await getPending("enroll");
  if (!userId) return { error: "expired" };
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.totpSecret || user.totpEnabled) return { error: "expired" };

  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!authenticator.verify({ token: code, secret: user.totpSecret })) return { error: "code_wrong" };

  const codes = makeRecoveryCodes();
  const hashes = await Promise.all(codes.map((c) => bcrypt.hash(c, 10)));
  await db.user.update({
    where: { id: user.id },
    data: { totpEnabled: true, recoveryCodes: JSON.stringify(hashes) },
  });
  // No cookie changes here: that would re-render the page and hide the codes.
  // The session starts when the manager clicks "continue" (finishEnrollAction).
  return { ok: true, codes };
}

export async function finishEnrollAction() {
  const userId = await getPending("enroll");
  const user = userId ? await db.user.findUnique({ where: { id: userId } }) : null;
  if (!user?.totpEnabled) redirect("/login");
  await createSession(user.id);
  redirect("/");
}

// ---------- Login ----------

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.user.findUnique({ where: { username } });

  if (!user || !user.totpEnabled) {
    await bcrypt.hash(password, 12); // same timing whether or not the user exists
    return { error: "login_wrong" };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) return { error: "locked" };
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    await registerFailure(user.id, user.failedAttempts);
    return { error: "login_wrong" };
  }
  await setPending(user.id, "verify");
  redirect("/login/verify");
}

export async function verifyAction(_: FormState, form: FormData): Promise<FormState> {
  const userId = await getPending("verify");
  if (!userId) return { error: "expired" };
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.totpSecret) return { error: "expired" };
  if (user.lockedUntil && user.lockedUntil > new Date()) return { error: "locked" };

  const raw = String(form.get("code") ?? "").trim();
  const code = raw.replace(/\s/g, "");
  let ok = /^\d{6}$/.test(code) && authenticator.verify({ token: code, secret: user.totpSecret });

  if (!ok && raw.length >= 10) {
    // Try a one-time recovery code. Each works once.
    const hashes: string[] = JSON.parse(user.recoveryCodes || "[]");
    const input = raw.toUpperCase();
    for (let i = 0; i < hashes.length; i++) {
      if (await bcrypt.compare(input, hashes[i])) {
        hashes.splice(i, 1);
        await db.user.update({ where: { id: user.id }, data: { recoveryCodes: JSON.stringify(hashes) } });
        await db.activityLog.create({
          data: { action: "recovery_code_used", entity: "user", entityId: user.id, summary: `Recovery code used (${hashes.length} left)` },
        });
        ok = true;
        break;
      }
    }
  }

  if (!ok) {
    await registerFailure(user.id, user.failedAttempts);
    return { error: "code_wrong" };
  }
  await db.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null } });
  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function setLanguageAction(form: FormData) {
  const lang = form.get("lang") === "en" ? "en" : "ku";
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 365 * 24 * 60 * 60, sameSite: "lax" });
  const back = String(form.get("back") ?? "/");
  redirect(back.startsWith("/") && !back.startsWith("//") ? back : "/");
}
