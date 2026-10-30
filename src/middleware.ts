import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// A fast redirect for visitors with no session cookie on the app's private pages. This is not the
// security check: every page and action re-validates the session on the server through requireUser().
// Only the private routes are guarded, so unknown addresses fall through to a real 404.
const PRIVATE = ["/today", "/habits", "/calendar", "/reviews", "/analytics", "/settings"];
const AUTH_PAGES = ["/login", "/register"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasCookie = Boolean(getSessionCookie(req));
  const isPrivate = PRIVATE.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!hasCookie && isPrivate) return NextResponse.redirect(new URL("/login", req.url));
  if (hasCookie && AUTH_PAGES.includes(pathname)) return NextResponse.redirect(new URL("/today", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/today/:path*", "/habits/:path*", "/calendar/:path*", "/reviews/:path*", "/analytics/:path*", "/settings/:path*", "/login", "/register"],
};
