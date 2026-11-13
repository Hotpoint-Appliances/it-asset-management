import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  resolveSessionToken,
  SESSION_COOKIE,
  sessionCookieDeletion,
} from "@/lib/auth/session";

// Signed-out pages; a signed-in visitor is sent to the dashboard instead.
const GUEST_PATHS = ["/login", "/forgot-password"];
// Open either way: an emailed reset link can be followed from a browser that's still signed in
// (the reset signs that session out too).
const OPEN_PATHS = ["/reset-password", "/acknowledge"];

/** An app-relative URL on this request's origin. Built from `nextUrl`, not
 * `new URL(path, request.url)`: nextUrl keeps the base path, a plain URL would drop it.
 * `pathname` (and so `from`) is app-relative too. */
function appUrl(
  request: NextRequest,
  path: string,
  params: Record<string, string> = {},
): URL {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = new URLSearchParams(params).toString();
  return url;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isGuestPath = GUEST_PATHS.includes(pathname);
  const isPublicPath = isGuestPath || OPEN_PATHS.includes(pathname);

  // The same DB-backed check getSession() uses (Proxy runs on Node.js in Next 16, so pg works
  // here). A token-only check would loop for a deactivated user: the layout would send them to
  // /login and this would bounce them straight back to /.
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await resolveSessionToken(token);
  // A cookie that no longer maps to an active user is dropped, so the browser stops sending it.
  const staleCookie = Boolean(token) && !session;

  let response: NextResponse;
  if (!isPublicPath && !session) {
    response = NextResponse.redirect(
      appUrl(request, "/login", { from: pathname }),
    );
  } else if (isGuestPath && session) {
    response = NextResponse.redirect(appUrl(request, "/"));
  } else {
    response = NextResponse.next();
  }

  if (staleCookie) response.cookies.delete(sessionCookieDeletion());
  return response;
}

export const config = {
  // API routes verify the session themselves (see the Route Handlers note in
  // itam-conventions) and return JSON 401/403 rather than an HTML redirect.
  // App icons are excluded too: redirecting them to /login hands the browser an
  // HTML page instead of an image (Firefox prefers icon.svg over favicon.ico).
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|logo-dark.svg|logo-white.svg).*)",
  ],
};
