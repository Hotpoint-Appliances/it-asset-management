import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  // The same DB-backed check getSession() uses (Proxy runs on Node.js in Next 16, so pg works
  // here). A token-only check would loop for a deactivated user: the layout would send them to
  // /login and this would bounce them straight back to /.
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await resolveSessionToken(token);
  // A cookie that no longer maps to an active user is dropped, so the browser stops sending it.
  const staleCookie = Boolean(token) && !session;

  let response: NextResponse;
  if (!isPublicPath && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    response = NextResponse.redirect(loginUrl);
  } else if (isPublicPath && session) {
    response = NextResponse.redirect(new URL("/", request.url));
  } else {
    response = NextResponse.next();
  }

  if (staleCookie) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  // API routes verify the session themselves (see the Route Handlers note in
  // itam-conventions) and return JSON 401/403 rather than an HTML redirect.
  // App icons are excluded too: redirecting them to /login hands the browser an
  // HTML page instead of an image (Firefox prefers icon.svg over favicon.ico).
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)",
  ],
};
