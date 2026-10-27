import { NextRequest, NextResponse, after } from "next/server";
import { resetPasswordWithToken } from "@/lib/db/passwordResets";
import { isEmailConfigured } from "@/lib/email/graphClient";
import { sendEmail } from "@/lib/email/sendEmail";
import { renderPasswordChangedEmail } from "@/lib/email/templates";
import { validateResetPasswordInput } from "@/lib/validation/auth";

/** Public: sets a new password from an emailed reset link (see app/api/auth/forgot-password).
 * Every existing session is revoked and no new one is issued; the user signs in with the new
 * password. Rate limited by nginx alongside /api/auth/login (deploy/nginx-itam.conf). */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const validated = validateResetPasswordInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const { token, newPassword } = validated.data;
  const user = await resetPasswordWithToken(token, newPassword);
  if (!user) {
    return NextResponse.json(
      {
        error: "This reset link is invalid or has expired. Request a new one.",
        code: "invalid_token",
      },
      { status: 400 },
    );
  }

  // Tells the account owner, so a reset they didn't make doesn't go unnoticed.
  if (isEmailConfigured()) {
    after(async () => {
      try {
        const { subject, html } = renderPasswordChangedEmail(user.fullName);
        await sendEmail({ to: user.email, subject, html });
      } catch (err) {
        console.error("[reset-password] confirmation email failed", err);
      }
    });
  }

  return NextResponse.json({ ok: true });
}
