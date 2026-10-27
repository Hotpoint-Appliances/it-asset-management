import { NextRequest, NextResponse, after } from "next/server";
import { findUserByEmail } from "@/lib/db/users";
import {
  createPasswordResetToken,
  RESET_TOKEN_TTL_MINUTES,
} from "@/lib/db/passwordResets";
import { isEmailConfigured } from "@/lib/email/graphClient";
import { sendEmail } from "@/lib/email/sendEmail";
import { appUrl, renderPasswordResetEmail } from "@/lib/email/templates";
import { validateForgotPasswordInput } from "@/lib/validation/auth";

const LOG = "[forgot-password]";
const isProduction = process.env.NODE_ENV === "production";

/** The emailed link. Production uses ITAM_APP_URL only: the request's own origin comes from the
 * Host header, which a caller controls, and would let them point a victim's link at their own
 * site. Dev falls back to it so a local setup works without the variable. */
function resetLink(request: NextRequest, token: string): string | null {
  const path = `/reset-password?token=${encodeURIComponent(token)}`;
  return (
    appUrl(path) ?? (isProduction ? null : `${request.nextUrl.origin}${path}`)
  );
}

async function sendResetLink(request: NextRequest, email: string) {
  const user = await findUserByEmail(email);
  if (!user || !user.isActive) return;
  const token = await createPasswordResetToken(user.id);
  if (!token) return; // one was sent within the cooldown
  const link = resetLink(request, token);
  if (!link) {
    console.error(`${LOG} ITAM_APP_URL isn't set, so no link can be emailed`);
    return;
  }
  if (!isEmailConfigured()) {
    if (isProduction) {
      console.error(`${LOG} email isn't configured; no link sent to ${email}`);
    } else {
      console.info(`${LOG} email is off; reset link for ${email}: ${link}`);
    }
    return;
  }
  const { subject, html } = renderPasswordResetEmail(
    user.fullName,
    link,
    RESET_TOKEN_TTL_MINUTES,
  );
  await sendEmail({ to: user.email, subject, html });
}

/** Public: emails a reset link if `email` belongs to an active user. The answer is the same
 * either way, and the lookup and send run after the response, so neither the body nor the
 * response time reveals whether an account exists. Rate limited by nginx alongside
 * /api/auth/login (deploy/nginx-itam.conf). */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const validated = validateForgotPasswordInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const { email } = validated.data;
  after(async () => {
    try {
      await sendResetLink(request, email);
    } catch (err) {
      console.error(`${LOG} sending a reset link failed`, err);
    }
  });

  return NextResponse.json({ ok: true });
}
