import { optionalString, requireString } from "./helpers";
import { REISSUE_REASONS } from "@/lib/issueForms/rules";
import type { IssueFormInput } from "@/types/issueForm";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function tooLong(value: string | null, max: number): boolean {
  return value !== null && value.length > max;
}

export function validateIssueFormInput(body: unknown): Result<IssueFormInput> {
  if (typeof body !== "object" || body === null) {
    return { success: false, error: "Invalid request" };
  }
  const b = body as Record<string, unknown>;

  const make = requireString(b.make, "Make");
  if (!make.ok) return { success: false, error: make.error };
  const model = requireString(b.model, "Model");
  if (!model.ok) return { success: false, error: model.error };
  const payrollNumber = requireString(b.payrollNumber, "Payroll number");
  if (!payrollNumber.ok) {
    return { success: false, error: payrollNumber.error };
  }
  const approverEmail = requireString(b.approverEmail, "Approved by");
  if (!approverEmail.ok) {
    return { success: false, error: approverEmail.error };
  }

  const conditionComment = optionalString(b.conditionComment);
  const remarks = optionalString(b.remarks);
  const recipientEmail = optionalString(b.recipientEmail);
  const reissueReason = optionalString(b.reissueReason);
  if (
    conditionComment === undefined ||
    remarks === undefined ||
    recipientEmail === undefined ||
    reissueReason === undefined
  ) {
    return { success: false, error: "Invalid request" };
  }

  if (make.value.length > 100) {
    return { success: false, error: "Make is too long" };
  }
  if (model.value.length > 200) {
    return { success: false, error: "Model is too long" };
  }
  if (payrollNumber.value.length > 50) {
    return { success: false, error: "Payroll number is too long" };
  }
  if (tooLong(conditionComment, 300)) {
    return { success: false, error: "Condition comment is too long" };
  }
  if (tooLong(remarks, 500)) {
    return { success: false, error: "Remarks are too long" };
  }
  if (
    recipientEmail !== null &&
    (recipientEmail.length > 150 || !EMAIL.test(recipientEmail))
  ) {
    return { success: false, error: "Enter a valid email address" };
  }
  if (reissueReason !== null && !REISSUE_REASONS.includes(reissueReason)) {
    return { success: false, error: "Choose a listed re-issue reason" };
  }

  return {
    success: true,
    data: {
      make: make.value,
      model: model.value,
      conditionComment,
      payrollNumber: payrollNumber.value,
      approverEmail: approverEmail.value,
      remarks,
      recipientEmail,
      reissueReason,
    },
  };
}

/** A note from one person to another: void reasons and reported problems. */
export function validateReason(
  value: unknown,
  label: string,
  max: number,
): Result<string> {
  const reason = requireString(value, label);
  if (!reason.ok) return { success: false, error: reason.error };
  if (reason.value.length > max) {
    return { success: false, error: `${label} is too long` };
  }
  return { success: true, data: reason.value };
}
