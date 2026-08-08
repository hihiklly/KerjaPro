import { and, asc, eq } from "drizzle-orm";
import { serviceCatalog } from "../../../db/schema";
import { enumValue, getAccountContext, optionalInteger, optionalString, readJson, requiredString, routeError } from "../_lib/http";

export async function GET() {
  try {
    const { db, accountId } = await getAccountContext();
    const items = await db.select().from(serviceCatalog).where(and(eq(serviceCatalog.accountId, accountId), eq(serviceCatalog.active, true))).orderBy(asc(serviceCatalog.category), asc(serviceCatalog.sortOrder), asc(serviceCatalog.name));
    return Response.json({ items });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { db, accountId, role } = await getAccountContext();
    if (role === "worker") return Response.json({ error: "Only owners and managers can edit the menu" }, { status: 403 });
    const payload = await readJson(request);
    const itemType = enumValue(payload, "itemType", ["service", "product"] as const, "service");
    const name = requiredString(payload, "name", 200);
    const price = optionalInteger(payload, "standardPriceMinor", { min: 0, max: 1_000_000_000 });
    if (price === null) return Response.json({ error: "standardPriceMinor is required" }, { status: 400 });
    const [item] = await db.insert(serviceCatalog).values({
      id: crypto.randomUUID(), accountId, code: optionalString(payload, "code", 100) ?? `${itemType.slice(0, 1).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      itemType, category: requiredString(payload, "category", 100), name,
      description: optionalString(payload, "description", 1_000), unit: requiredString(payload, "unit", 50),
      standardPriceMinor: price, estimatedDurationMinutes: optionalInteger(payload, "estimatedDurationMinutes", { min: 0, max: 100_000 }),
      taxRateBasisPoints: optionalInteger(payload, "taxRateBasisPoints", { min: 0, max: 10_000 }) ?? 0,
      costMinor: optionalInteger(payload, "costMinor", { min: 0, max: 1_000_000_000 }),
      commissionBasisPoints: optionalInteger(payload, "commissionBasisPoints", { min: 0, max: 10_000 }),
    }).returning();
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
