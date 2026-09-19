import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "itam_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8h workday session

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set. Copy .env.example to .env.local and fill it in.",
    );
  }
  return new TextEncoder().encode(secret);
}

export type RoleName = "admin" | "asset_manager" | "viewer";

export interface SessionPayload extends JWTPayload {
  userId: string;
  roleId: number;
  roleName: RoleName;
  departmentId: number | null;
  fullName: string;
  email: string;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Reads and verifies the session cookie. Returns null if absent/invalid/expired. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Reads the session, redirecting to /login if absent/invalid/expired. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/** Reads the session and enforces the role is one of `roles`, redirecting to /403 otherwise. */
export async function requireRole(roles: RoleName[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!roles.includes(session.roleName)) {
    redirect("/403");
  }
  return session;
}
