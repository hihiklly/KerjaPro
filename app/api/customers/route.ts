import { and, asc, desc, eq, isNull, like, or } from "drizzle-orm";
import { customers } from "../../../db/schema";
import { getAccountContext, listOptions, optionalString, readJson, requiredString, routeError } from "../_lib/http";

export async function GET(request: Request) {
  try {
    const { db, accountId } = await getAccountContext();
    const { limit, offset } = listOptions(request);
    const query = new URL(request.url).searchParams.get("q")?.trim();
    const search = query
      ? or(
          like(customers.name, `%${query}%`),
          like(customers.phone, `%${query}%`),
          like(customers.serviceAddress, `%${query}%`),
        )
      : undefined;
    const rows = await db.select().from(customers).where(
      and(eq(customers.accountId, accountId), isNull(customers.deletedAt), search),
    ).orderBy(asc(customers.name), desc(customers.createdAt)).limit(limit).offset(offset);
    return Response.json({ customers: rows, pagination: { limit, offset } });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { db, accountId } = await getAccountContext();
    const payload = await readJson(request);
    const tags = payload.tags ?? [];
    if (!Array.isArray(tags) || tags.some(tag => typeof tag !== "string")) {
      return Response.json({ error: "tags must be an array of strings" }, { status: 400 });
    }
    const [customer] = await db.insert(customers).values({
      id: crypto.randomUUID(),
      accountId,
      name: requiredString(payload, "name", 200),
      phone: requiredString(payload, "phone", 50),
      whatsapp: optionalString(payload, "whatsapp", 50),
      email: optionalString(payload, "email", 320),
      serviceAddress: requiredString(payload, "serviceAddress", 1_000),
      notes: optionalString(payload, "notes", 5_000),
      tagsJson: JSON.stringify(tags.map(tag => tag.trim()).filter(Boolean)),
    }).returning();
    return Response.json({ customer }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
