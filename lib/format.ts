/** KES — the company is Kenya-based (hotpoint.co.ke); every money value in the schema
 * (purchase_cost, salvage_value, disposal_value, maintenance cost, ...) is denominated in it. */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-KE", { style: "currency", currency: "KES" });
}
