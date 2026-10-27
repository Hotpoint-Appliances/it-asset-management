import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password",
  description:
    "Get an email with a link to reset your IT Asset Manager password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
