export type LineItem = { quantityMilli: number; unitPriceMinor: number };
export const calculateTotalMinor = (items: LineItem[], discountMinor = 0, taxMinor = 0) => {
  const subtotalMinor = items.reduce((sum, item) => sum + Math.round(item.quantityMilli * item.unitPriceMinor / 1000), 0);
  return { subtotalMinor, totalMinor: Math.max(0, subtotalMinor - discountMinor + taxMinor) };
};
export const nextDocumentNumber = (prefix: "Q" | "WR" | "INV", year: number, sequence: number) => `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
export const canConfirmDocument = (status: string, humanVerified: boolean) => status === "draft" && humanVerified;
export const consumeCredits = (subscription: number, purchased: number, amount = 1) => {
  if (amount < 1 || subscription + purchased < amount) throw new Error("INSUFFICIENT_CREDITS");
  const fromSubscription = Math.min(subscription, amount);
  return { subscription: subscription - fromSubscription, purchased: purchased - (amount - fromSubscription) };
};
