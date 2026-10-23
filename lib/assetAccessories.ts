/** Statuses in which an asset's accessories are frozen (docs/asset-lifecycle-flow.md rule 8):
 * disposed is terminal, and a lost/stolen asset isn't in hand, so its kit can't be verified.
 * Keyed on status names like the other lifecycle rules. Shared by the API routes and the UI, so
 * the form disables the section for exactly the statuses the server rejects. */
const ACCESSORY_LOCKED_STATUSES = new Set(["disposed", "lost", "stolen"]);

export function canEditAccessories(statusName: string | null | undefined) {
  return !!statusName && !ACCESSORY_LOCKED_STATUSES.has(statusName);
}

export const MAX_ACCESSORY_QUANTITY = 999;

/** "Charger × 2", the display form used in the asset register and audit log rows. */
export function formatAccessory(a: {
  name: string;
  quantity: number;
  notes?: string | null;
}): string {
  const base = `${a.name} × ${a.quantity}`;
  return a.notes ? `${base} (${a.notes})` : base;
}
