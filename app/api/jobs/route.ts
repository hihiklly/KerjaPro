import { and, desc, eq, isNull } from "drizzle-orm";
import { customers, jobs } from "../../../db/schema";
import { ApiError, enumValue, getAccountContext, listOptions, optionalInteger, optionalString, readJson, requiredString, routeError } from "../_lib/http";

const JOB_STATUSES = ["new", "quoted", "confirmed", "in_progress", "completed", "cancelled"] as const;

export async function GET(request: Request) {
  try {
    const { db, accountId } = await getAccountContext();
    const { limit, offset } = listOptions(request);
    const params = new URL(request.url).searchParams;
    const status = params.get("status");
    const customerId = params.get("customerId");
    if (status && !JOB_STATUSES.includes(status as (typeof JOB_STATUSES)[number])) {
      throw new ApiError(400, `status must be one of: ${JOB_STATUSES.join(", ")}`);
    }
    const rows = await db.select({ job: jobs, customer: customers }).from(jobs)
      .innerJoin(customers, and(eq(customers.id, jobs.customerId), eq(customers.accountId, accountId)))
      .where(and(
        eq(jobs.accountId, accountId),
        status ? eq(jobs.status, status as (typeof JOB_STATUSES)[number]) : undefined,
        customerId ? eq(jobs.customerId, customerId) : undefined,
        isNull(customers.deletedAt),
      ))
      .orderBy(desc(jobs.appointmentAt), desc(jobs.createdAt))
      .limit(limit).offset(offset);
    return Response.json({ jobs: rows, pagination: { limit, offset } });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { db, accountId } = await getAccountContext();
    const payload = await readJson(request);
    const customerId = requiredString(payload, "customerId", 100);
    const [customer] = await db.select({ id: customers.id, serviceAddress: customers.serviceAddress })
      .from(customers).where(and(
        eq(customers.id, customerId),
        eq(customers.accountId, accountId),
        isNull(customers.deletedAt),
      )).limit(1);
    if (!customer) throw new ApiError(400, "customerId does not belong to this workspace");

    const [job] = await db.insert(jobs).values({
      id: crypto.randomUUID(),
      accountId,
      customerId,
      jobNumber: requiredString(payload, "jobNumber", 100),
      category: requiredString(payload, "category", 100),
      serviceAddress: optionalString(payload, "serviceAddress", 1_000) ?? customer.serviceAddress,
      request: requiredString(payload, "request", 5_000),
      appointmentAt: optionalString(payload, "appointmentAt", 50),
      technician: optionalString(payload, "technician", 200),
      internalNotes: optionalString(payload, "internalNotes", 5_000),
      followUpAt: optionalString(payload, "followUpAt", 50),
      paymentTermDays: optionalInteger(payload, "paymentTermDays", { min: 0, max: 365 }),
      status: enumValue(payload, "status", JOB_STATUSES, "new"),
    }).returning();
    return Response.json({ job }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
