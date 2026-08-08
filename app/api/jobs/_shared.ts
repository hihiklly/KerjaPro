import { ApiError, optionalInteger, optionalString, requiredString } from "../_lib/http";

export const JOB_STATUSES = ["draft", "quote_sent", "quote_accepted", "scheduled", "in_progress", "completed", "payment_due", "paid", "cancelled"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export type ParsedJobItem = {
  id: string;
  catalogItemId: string | null;
  itemType: "service" | "product" | "custom";
  description: string;
  quantityMilli: number;
  unit: string;
  unitPriceMinor: number;
  taxRateBasisPoints: number;
  taxMinor: number;
  costMinor: number | null;
  commissionBasisPoints: number | null;
  amountMinor: number;
};

export function parseJobItems(value: unknown): ParsedJobItem[] {
  if (!Array.isArray(value) || value.length === 0) throw new ApiError(400, "Add at least one service or product");
  if (value.length > 100) throw new ApiError(400, "A job can contain at most 100 items");
  return value.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ApiError(400, `items[${index}] must be an object`);
    const item = raw as Record<string, unknown>;
    const quantityMilli = optionalInteger(item, "quantityMilli", { min: 1, max: 1_000_000_000 });
    const unitPriceMinor = optionalInteger(item, "unitPriceMinor", { min: 0, max: 1_000_000_000 });
    const taxRateBasisPoints = optionalInteger(item, "taxRateBasisPoints", { min: 0, max: 10_000 }) ?? 0;
    if (quantityMilli === null || unitPriceMinor === null) throw new ApiError(400, `items[${index}] requires quantity and price`);
    const amountMinor = Math.round(quantityMilli * unitPriceMinor / 1_000);
    const taxMinor = Math.round(amountMinor * taxRateBasisPoints / 10_000);
    if (!Number.isSafeInteger(amountMinor + taxMinor)) throw new ApiError(400, `items[${index}] amount is too large`);
    const itemType = item.itemType;
    if (itemType !== "service" && itemType !== "product" && itemType !== "custom") throw new ApiError(400, `items[${index}].itemType is invalid`);
    return {
      id: crypto.randomUUID(),
      catalogItemId: optionalString(item, "catalogItemId", 100),
      itemType,
      description: requiredString(item, "description", 500),
      quantityMilli,
      unit: requiredString(item, "unit", 50),
      unitPriceMinor,
      taxRateBasisPoints,
      taxMinor,
      costMinor: optionalInteger(item, "costMinor", { min: 0, max: 1_000_000_000 }),
      commissionBasisPoints: optionalInteger(item, "commissionBasisPoints", { min: 0, max: 10_000 }),
      amountMinor,
    };
  });
}

export function jobTotals(items: ParsedJobItem[], discountMinor = 0) {
  const subtotalMinor = items.reduce((sum, item) => sum + item.amountMinor, 0);
  const taxMinor = items.reduce((sum, item) => sum + item.taxMinor, 0);
  return { subtotalMinor, taxMinor, totalMinor: Math.max(0, subtotalMinor - discountMinor + taxMinor) };
}

export function nextNumber(prefix: string) {
  const now = new Date();
  const token = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
  return `${prefix}-${now.getUTCFullYear()}-${token}`;
}
