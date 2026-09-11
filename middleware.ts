import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./lib/auth/session";

/**
 * Route protection. Everything except /login (and Next internals) requires a
 * valid session. Middleware runs on the Edge runtime, so it only verifies the
 * JWT signature — no filesystem access here. Server pages/handlers re-check the
 * session via getSession() for defense in depth.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths reachable without a session: the login page and the auth
  // endpoints (login/logout) themselves.
  const isLoginPage = pathname === "/login";
  const isAuthApi = pathname.startsWith("/api/auth/");

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (session) {
    // Signed-in users shouldn't sit on the login page.
    if (isLoginPage) {
      return NextResponse.redirect(new URL("/tests", req.url));
    }
    return NextResponse.next();
  }

  // Unauthenticated.
  if (isLoginPage || isAuthApi) {
    return NextResponse.next();
  }

  // API calls get a 401 (JSON); page requests get redirected to /login.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Protect everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)"],
};
