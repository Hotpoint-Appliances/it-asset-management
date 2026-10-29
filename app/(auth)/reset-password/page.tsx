import type { Metadata } from "next";
import { isPasswordResetTokenValid } from "@/lib/db/passwordResets";
import {
  ResetLinkInvalid,
  ResetPasswordForm,
} from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your IT Asset Manager account.",
  // The token is in this page's URL; never send it on to another site in a Referer header.
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  // Checked up front, so an expired link says so before the user types a new password.
  if (typeof token !== "string" || !(await isPasswordResetTokenValid(token))) {
    return <ResetLinkInvalid />;
  }
  return <ResetPasswordForm token={token} />;
}
