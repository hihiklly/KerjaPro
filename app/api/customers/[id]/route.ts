import { and, desc, eq, isNull } from "drizzle-orm";
import { customers, documents, jobs, reminders } from "../../../../db/schema";
import { ApiError, getAccountContext, optionalString, readJson, requiredString, routeError } from "../../_lib/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { db, accountId } = await getAccountContext();
    const [customer] = await db.select().from(customers).where(
      and(eq(customers.id, id), eq(customers.accountId, accountId), isNull(customers.deletedAt)),
    ).limit(1);
    if (!customer) throw new ApiError(404, "Customer not found");

    const [customerJobs, customerDocuments, customerReminders] = await Promise.all([
      db.select().from(jobs).where(and(eq(jobs.accountId, accountId), eq(jobs.customerId, id))).orderBy(desc(jobs.createdAt)),
      db.select().from(documents).where(and(eq(documents.accountId, accountId), eq(documents.customerId, id))).orderBy(desc(documents.createdAt)),
      db.select().from(reminders).where(and(eq(reminders.accountId, accountId), eq(reminders.customerId, id))).orderBy(desc(reminders.dueAt)),
    ]);
    return Response.json({ customer, jobs: customerJobs, documents: customerDocuments, reminders: customerReminders });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { db, accountId } = await getAccountContext();
    const payload = await readJson(request);
    const updates: Partial<typeof customers.$inferInsert> = { updatedAt: new Date().toISOString() };
    if ("name" in payload) updates.name = requiredString(payload, "name", 200);
    if ("phone" in payload) updates.phone = requiredString(payload, "phone", 50);
    if ("serviceAddress" in payload) updates.serviceAddress = requiredString(payload, "serviceAddress", 1_000);
    if ("whatsapp" in payload) updates.whatsapp = optionalString(payload, "whatsapp", 50);
    if ("email" in payload) updates.email = optionalString(payload, "email", 320);
    if ("notes" in payload) updates.notes = optionalString(payload, "notes", 5_000);
    if ("tags" in payload) {
      if (!Array.isArray(payload.tags) || payload.tags.some(tag => typeof tag !== "string")) {
        throw new ApiError(400, "tags must be an array of strings");
      }
      updates.tagsJson = JSON.stringify(payload.tags.map(tag => tag.trim()).filter(Boolean));
    }
    const [customer] = await db.update(customers).set(updates).where(
      and(eq(customers.id, id), eq(customers.accountId, accountId), isNull(customers.deletedAt)),
    ).returning();
    if (!customer) throw new ApiError(404, "Customer not found");
    return Response.json({ customer });
  } catch (error) {
    return routeError(error);
  }
}
