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

export type CreditBuckets = { subscription: number; welcome: number; purchased: number };
export type CreditReservation = {
  idempotencyKey: string;
  generationId: string;
  status: "reserved" | "committed" | "reversed";
  debit: CreditBuckets;
};

export const reserveGenerationCredit = (
  balances: CreditBuckets,
  idempotencyKey: string,
  generationId: string,
  previous?: CreditReservation,
) => {
  if (previous?.idempotencyKey === idempotencyKey) return { balances, reservation: previous, duplicate: true };
  if (balances.subscription + balances.welcome + balances.purchased < 1) throw new Error("INSUFFICIENT_CREDITS");
  const debit: CreditBuckets = { subscription: 0, welcome: 0, purchased: 0 };
  if (balances.subscription > 0) debit.subscription = 1;
  else if (balances.welcome > 0) debit.welcome = 1;
  else debit.purchased = 1;
  return {
    balances: {
      subscription: balances.subscription - debit.subscription,
      welcome: balances.welcome - debit.welcome,
      purchased: balances.purchased - debit.purchased,
    },
    reservation: { idempotencyKey, generationId, status: "reserved" as const, debit },
    duplicate: false,
  };
};

export const commitGenerationCredit = (reservation: CreditReservation): CreditReservation => {
  if (reservation.status !== "reserved") return reservation;
  return { ...reservation, status: "committed" };
};

export const reverseGenerationCredit = (balances: CreditBuckets, reservation: CreditReservation) => {
  if (reservation.status !== "reserved") return { balances, reservation };
  return {
    balances: {
      subscription: balances.subscription + reservation.debit.subscription,
      welcome: balances.welcome + reservation.debit.welcome,
      purchased: balances.purchased + reservation.debit.purchased,
    },
    reservation: { ...reservation, status: "reversed" as const },
  };
};

export const requireAdminReason = (role: string, reason: string) => {
  if (role !== "admin") throw new Error("FORBIDDEN");
  if (!reason.trim()) throw new Error("ADMIN_REASON_REQUIRED");
  return true;
};
