import type { BadgeProps } from "@/components/ui/Badge";
import { formatLookupName, statusKey } from "@/lib/badgeVariants";
import type { IssueFormStatus } from "@/types/issueForm";

/** How long an emailed link works, counted from the latest send. */
export const LINK_TTL_DAYS = 14;
/** Days after the latest send that a still-pending form is chased. */
export const REMINDER_DAYS = [3, 7];
/** A form can't be re-sent sooner than this, so the button can't flood an inbox. */
export const RESEND_COOLDOWN_SECONDS = 60;

export const SPECIFICATIONS_MAX_LENGTH = 1000;
/** What migration 008 gave forms from before specifications were recorded. Never a prefill. */
export const UNRECORDED_SPECIFICATIONS = "Not specified";

export const REISSUE_REASONS = [
  "Replacement equipment",
  "Lost copy",
  "Correction",
  "Other",
];

/** The paper form's wording. Copied onto each form when it's triggered, so changing this later
 * doesn't alter what anyone has already agreed to. */
export const DISCLAIMER = [
  "The Equipment(s) and accessories issued remain the property of Hotpoint Appliances Ltd. They shall be handled as such and returned in good and original condition upon request.",
  "Any damage or loss of the equipment shall be the liability of the handler.",
  "Any communication done using the Equipment shall be the holder's and not necessarily the view of the Company and as such will be the sole responsibility of the user.",
  "In case of any additional software or hardware and/or accessories kindly liaise with the ICT Department.",
];

const ISSUABLE_STATUSES = ["active", "reserved"];
/** Moving into one of these cancels an open form. */
export const VOIDING_STATUSES = ["disposed", "lost", "stolen"];

export function canIssueForm(statusName: string): boolean {
  return ISSUABLE_STATUSES.includes(statusKey(statusName));
}

export function formatIssueFormNumber(n: number | string): string {
  return `EIF-${String(n).padStart(6, "0")}`;
}

export const ISSUE_FORM_STATUS_LABELS: Record<IssueFormStatus, string> = {
  pending: "Pending",
  acknowledged: "Acknowledged",
  disputed: "Disputed",
  voided: "Voided",
  superseded: "Superseded",
  expired: "Expired",
};

export const ISSUE_FORM_STATUS_VARIANTS: Record<
  IssueFormStatus,
  NonNullable<BadgeProps["variant"]>
> = {
  pending: "warning",
  acknowledged: "success",
  disputed: "danger",
  voided: "neutral",
  superseded: "neutral",
  expired: "neutral",
};

/** Names differ only in case and spacing between what's printed and what's typed. */
export function normalizeName(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

/** Asset names lead with a product line as often as a brand ("MacBook Air M2"), so the first word
 * alone would print "MacBook" as the make. */
const BRAND_BY_PRODUCT_LINE: Record<string, string> = {
  macbook: "Apple",
  imac: "Apple",
  mac: "Apple",
  ipad: "Apple",
  iphone: "Apple",
  thinkpad: "Lenovo",
  thinkcentre: "Lenovo",
  ideapad: "Lenovo",
  latitude: "Dell",
  optiplex: "Dell",
  xps: "Dell",
  inspiron: "Dell",
  precision: "Dell",
  elitebook: "HP",
  probook: "HP",
  prodesk: "HP",
  pavilion: "HP",
};

/** Best guess at the printed Make and Model; both stay editable when the form is triggered. A
 * recorded model number wins over anything read from the name. */
export function deriveMakeAndModel(
  assetName: string,
  modelNumber: string | null,
): { make: string; model: string } {
  const name = assetName.replace(/\([^)]*\)/g, " ").trim();
  const words = name.split(/\s+/).filter(Boolean);
  const first = words[0] ?? "";
  const brand = BRAND_BY_PRODUCT_LINE[first.toLowerCase()];
  return {
    make: brand ?? first,
    model: modelNumber?.trim() || (brand ? name : words.slice(1).join(" ")),
  };
}

export function issuableStatusMessage(statusName: string): string {
  return `A form can only be issued for an active or reserved asset. This one is ${formatLookupName(statusName).toLowerCase()}.`;
}
