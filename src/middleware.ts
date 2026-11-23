import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Everything needs a login except these public paths.
const PUBLIC = [/^\/login/, /^\/setup/, /^\/s\//, /^\/_next\//, /^\/favicon/];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();

  const token = req.cookies.get("homat_session")?.value;
  const secret = process.env.SESSION_SECRET;
  if (token && secret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      if (payload.kind === "session") return NextResponse.next();
    } catch {
      // fall through to redirect
    }
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
