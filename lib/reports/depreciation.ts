export type DepreciationOutcome =
  | {
      kind: "computed";
      monthsElapsed: number;
      accumulatedDepreciation: number;
      bookValue: number;
    }
  | { kind: "not_computed"; reason: string };

/** Whole calendar months from `from` to `to` (a month counts once its day-of-month is reached),
 * never negative. Works on the "YYYY-MM-DD" strings the db layer returns so no timezone can
 * shift a day. */
export function wholeMonthsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const months = (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0);
  return Math.max(0, months);
}

/** Straight-line book value (phase-6 scope decision: the only supported method):
 *
 *   (purchase_cost − salvage_value) / useful_life_months × months_elapsed
 *
 * as accumulated depreciation, with book value = cost − accumulated, floored at salvage value
 * (months beyond the useful life add nothing). Stateless per row, no schedule table. A missing
 * input yields `not_computed` with the reason rather than a misleading zero; a salvage value
 * above cost is treated as no depreciation. `asOf` is a "YYYY-MM-DD" date. */
export function computeStraightLine(
  asset: {
    depreciationMethod: string;
    purchaseDate: string | null;
    purchaseCost: number | null;
    usefulLifeMonths: number | null;
    salvageValue: number | null;
  },
  asOf: string,
): DepreciationOutcome {
  if (asset.depreciationMethod !== "straight_line") {
    return {
      kind: "not_computed",
      reason: `Method "${asset.depreciationMethod}" is not supported (straight line only)`,
    };
  }
  const missing: string[] = [];
  if (!asset.purchaseDate) missing.push("purchase date");
  if (asset.purchaseCost == null) missing.push("purchase cost");
  if (!asset.usefulLifeMonths || asset.usefulLifeMonths <= 0)
    missing.push("useful life");
  if (missing.length) {
    return { kind: "not_computed", reason: `Missing ${missing.join(", ")}` };
  }

  const cost = asset.purchaseCost!;
  const salvage = Math.min(asset.salvageValue ?? 0, cost);
  const life = asset.usefulLifeMonths!;
  const monthsElapsed = Math.min(
    wholeMonthsBetween(asset.purchaseDate!, asOf),
    life,
  );
  const accumulated = ((cost - salvage) / life) * monthsElapsed;
  const bookValue = Math.max(salvage, cost - accumulated);
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    kind: "computed",
    monthsElapsed,
    accumulatedDepreciation: round(cost - bookValue),
    bookValue: round(bookValue),
  };
}
