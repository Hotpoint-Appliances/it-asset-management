export type IssueFormStatus =
  "pending" | "acknowledged" | "disputed" | "voided" | "superseded" | "expired";

export interface IssueFormAccessory {
  name: string;
  quantity: number;
  notes: string | null;
}

export interface IssueForm {
  id: string;
  formNumber: string;
  assetId: string;
  status: IssueFormStatus;
  issueDate: string;
  equipmentType: string;
  make: string;
  model: string;
  specifications: string;
  serialNumber: string;
  financeAssetNo: string;
  physicalCondition: string;
  conditionComment: string | null;
  accessories: IssueFormAccessory[];
  department: string;
  location: string;
  issuedToName: string;
  issuedToUserId: string | null;
  recipientEmail: string;
  payrollNumber: string;
  approvedByName: string;
  approvedByEmail: string;
  remarks: string | null;
  reissueReason: string | null;
  disclaimer: string[];
  contentHash: string;
  expiresAt: string;
  lastSentAt: string | null;
  emailStatus: "pending" | "sent" | "failed";
  acknowledgedAt: string | null;
  acknowledgedName: string | null;
  userComments: string | null;
  disputedAt: string | null;
  disputeReason: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
  createdAt: string;
}

/** A row of the register (/issue-forms). `status` there is the effective one: a pending form past
 * its expiry reads as expired. */
export interface IssueFormListItem extends IssueForm {
  assetName: string;
  /** The asset was deleted; the form is kept as evidence. */
  assetDeleted: boolean;
}

export type IssueFormStatusCounts = Record<IssueFormStatus, number> & {
  /** Pending forms whose email didn't send. */
  emailFailed: number;
};

export interface IssueFormFilterOptions {
  departments: string[];
  locations: string[];
  approvers: { email: string; name: string }[];
  issuers: { id: string; name: string }[];
}

export interface Hod {
  name: string;
  email: string;
  department: string | null;
}

/** What the trigger dialog opens with. */
export interface IssueFormPrefill {
  /** Why a form can't be triggered right now, in words; null when it can. */
  blockedReason: string | null;
  issueDate: string;
  equipmentType: string;
  make: string;
  model: string;
  specifications: string;
  /** Where `specifications` came from, so the dialog can say; null when it starts empty. */
  specificationsSource: "form" | "notes" | null;
  serialNumber: string;
  financeAssetNo: string;
  physicalCondition: string;
  accessories: IssueFormAccessory[];
  department: string;
  location: string;
  issuedToName: string;
  recipientEmail: string;
  /** The owner is a system user, so the address comes from their account. */
  recipientEmailLocked: boolean;
  payrollNumber: string;
  hods: Hod[];
  /** The list came from the last successful fetch, not the requisitions app just now. */
  hodsStale: boolean;
  defaultHodEmail: string;
  /** This person has already acknowledged a form for this asset. */
  hasPriorAcknowledgement: boolean;
}

export interface IssueFormInput {
  make: string;
  model: string;
  specifications: string;
  payrollNumber: string;
  approverEmail: string;
  remarks: string | null;
  /** Only used when the owner has no system account. */
  recipientEmail: string | null;
  reissueReason: string | null;
}
