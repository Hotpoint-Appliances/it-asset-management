export type DisposalMethod =
  "sold" | "scrapped" | "donated" | "lost" | "stolen" | "other";

export interface AssetDisposal {
  id: number;
  assetId: string;
  disposalDate: string;
  disposalMethod: DisposalMethod;
  disposalValue: number | null;
  approvedBy: string;
  approvedByName: string;
  notes: string | null;
  attachmentPath: string | null;
  createdAt: string;
}

export interface DisposalInput {
  disposalDate: string;
  disposalMethod: DisposalMethod;
  disposalValue: number | null;
  notes: string | null;
}
