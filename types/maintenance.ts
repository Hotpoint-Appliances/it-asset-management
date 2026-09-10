export type MaintenanceType = "repair" | "service" | "inspection";
export type MaintenanceStatus =
  "scheduled" | "in_progress" | "completed" | "cancelled";

export interface AssetMaintenance {
  id: number;
  assetId: string;
  maintenanceType: MaintenanceType;
  vendorId: number | null;
  vendorName: string | null;
  scheduledDate: string | null;
  completedDate: string | null;
  cost: number | null;
  status: MaintenanceStatus;
  notes: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceInput {
  maintenanceType: MaintenanceType;
  vendorId: number | null;
  scheduledDate: string | null;
  notes: string | null;
}

export interface MaintenanceUpdateInput {
  status: MaintenanceStatus;
  completedDate: string | null;
  cost: number | null;
  notes: string | null;
}
