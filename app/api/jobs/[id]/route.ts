import { and, desc, eq } from "drizzle-orm";
import { customers, documents, jobAssignments, jobs, reminders } from "../../../../db/schema";
import { ApiError, enumValue, getAccountContext, optionalInteger, optionalString, readJson, requiredString, routeError } from "../../_lib/http";

const JOB_STATUSES = ["new", "quoted", "confirmed", "in_progress", "completed", "cancelled"] as const;
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { db, accountId } = await getAccountContext();
    const [record] = await db.select({ job: jobs, customer: customers }).from(jobs)
      .innerJoin(customers, and(eq(customers.id, jobs.customerId), eq(customers.accountId, accountId)))
      .where(and(eq(jobs.id, id), eq(jobs.accountId, accountId))).limit(1);
    if (!record) throw new ApiError(404, "Job not found");
    const [assignments, jobDocuments, jobReminders] = await Promise.all([
      db.select().from(jobAssignments).where(and(eq(jobAssignments.accountId, accountId), eq(jobAssignments.jobId, id))).orderBy(desc(jobAssignments.createdAt)),
      db.select().from(documents).where(and(eq(documents.accountId, accountId), eq(documents.jobId, id))).orderBy(desc(documents.createdAt)),
      db.select().from(reminders).where(and(eq(reminders.accountId, accountId), eq(reminders.jobId, id))).orderBy(desc(reminders.dueAt)),
    ]);
    return Response.json({ ...record, assignments, documents: jobDocuments, reminders: jobReminders });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { db, accountId } = await getAccountContext();
    const payload = await readJson(request);
    const updates: Partial<typeof jobs.$inferInsert> = { updatedAt: new Date().toISOString() };
    if ("jobNumber" in payload) updates.jobNumber = requiredString(payload, "jobNumber", 100);
    if ("category" in payload) updates.category = requiredString(payload, "category", 100);
    if ("serviceAddress" in payload) updates.serviceAddress = requiredString(payload, "serviceAddress", 1_000);
    if ("request" in payload) updates.request = requiredString(payload, "request", 5_000);
    if ("appointmentAt" in payload) updates.appointmentAt = optionalString(payload, "appointmentAt", 50);
    if ("technician" in payload) updates.technician = optionalString(payload, "technician", 200);
    if ("internalNotes" in payload) updates.internalNotes = optionalString(payload, "internalNotes", 5_000);
    if ("followUpAt" in payload) updates.followUpAt = optionalString(payload, "followUpAt", 50);
    if ("paymentTermDays" in payload) updates.paymentTermDays = optionalInteger(payload, "paymentTermDays", { min: 0, max: 365 });
    if ("status" in payload) {
      updates.status = enumValue(payload, "status", JOB_STATUSES);
      if (updates.status === "completed") updates.completedAt = new Date().toISOString();
      else updates.completedAt = null;
    }
    const [job] = await db.update(jobs).set(updates)
      .where(and(eq(jobs.id, id), eq(jobs.accountId, accountId))).returning();
    if (!job) throw new ApiError(404, "Job not found");
    return Response.json({ job });
  } catch (error) {
    return routeError(error);
  }
}
