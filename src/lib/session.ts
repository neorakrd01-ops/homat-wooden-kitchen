import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

export const SESSION_COOKIE = "homat_session";
export const PENDING_COOKIE = "homat_pending";
const SESSION_DAYS = 7;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (at least 32 characters).");
  return new TextEncoder().encode(s);
}

const secure = process.env.NODE_ENV === "production";

export async function createSession(userId: string) {
  const token = await new SignJWT({ kind: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  jar.delete(PENDING_COOKIE);
}

/** Short-lived cookie between "password OK" and "2-step code OK". */
export async function setPending(userId: string, stage: "verify" | "enroll") {
  const token = await new SignJWT({ kind: "pending", stage })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret());
  (await cookies()).set(PENDING_COOKIE, token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 15 * 60 });
}

export async function getPending(stage: "verify" | "enroll"): Promise<string | null> {
  const token = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.kind !== "pending" || payload.stage !== stage || !payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.kind !== "session" || !payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

/** Use at the top of every protected page and server action. */
export async function requireUser() {
  const id = await getSessionUserId();
  if (!id) redirect("/login");
  const user = await db.user.findUnique({ where: { id } });
  if (!user || !user.totpEnabled) redirect("/login");
  return user;
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(PENDING_COOKIE);
}
