export type NotificationType =
  | "asset_assigned"
  | "asset_transferred"
  | "maintenance_due"
  | "warranty_expiring";

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string | null;
  relatedAssetId: string | null;
  /** False when the recipient can't open the related asset (a viewer notified about an asset
   * outside their department): the UI then shows the notification without a link, rather than
   * one that leads to a 404. */
  assetViewable: boolean;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPage {
  items: Notification[];
  total: number;
  unreadCount: number;
}
