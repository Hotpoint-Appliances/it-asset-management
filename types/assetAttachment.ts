export interface AssetAttachment {
  id: number;
  assetId: string;
  filePath: string;
  fileName: string;
  fileType: string | null;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
}
