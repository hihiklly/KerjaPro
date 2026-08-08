import { and, eq } from "drizzle-orm";
import { customerPayments, documents, jobCompensations, jobEvents, jobs } from "../../../../../db/schema";
import { ApiError, enumValue, getAccountContext, optionalInteger, optionalString, readJson, routeError } from "../../../_lib/http";
import { nextNumber } from "../../_shared";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { db, accountId, user } = await getAccountContext();
    const payload = await readJson(request);
    const [job] = await db.select().from(jobs).where(and(eq(jobs.id, id), eq(jobs.accountId, accountId))).limit(1);
    if (!job || !["quote_accepted", "scheduled", "in_progress", "completed", "payment_due"].includes(job.status)) throw new ApiError(409, "Payment is not available for this job");
    const jobDocuments = await db.select().from(documents).where(and(eq(documents.accountId, accountId), eq(documents.jobId, id)));
    const invoice = jobDocuments.find(document => document.kind === "invoice") ?? jobDocuments.find(document => document.kind === "quotation");
    if (!invoice) throw new ApiError(409, "This job has no financial document");
    const amountMinor = optionalInteger(payload, "amountMinor", { min: 1, max: job.balanceMinor });
    if (amountMinor === null) throw new ApiError(400, "Enter a payment amount");
    const method = enumValue(payload, "method", ["cash", "bank_transfer", "duitnow", "card", "other"] as const);
    const now = new Date().toISOString();
    const balanceMinor = job.balanceMinor - amountMinor;
    const workFinished = ["completed", "payment_due"].includes(job.status);
    const status = workFinished ? (balanceMinor === 0 ? "paid" as const : "payment_due" as const) : job.status;
    await db.batch([
      db.insert(customerPayments).values({ id: crypto.randomUUID(), accountId, customerId: job.customerId, invoiceDocumentId: invoice.id, receiptNumber: nextNumber("RCP"), amountMinor, method, reference: optionalString(payload, "reference", 200), receivedAt: now, recordedByUserId: user.userId, idempotencyKey: crypto.randomUUID() }),
      db.update(jobs).set({ balanceMinor, status, closedAt: status === "paid" ? now : job.closedAt, updatedAt: now }).where(and(eq(jobs.id, id), eq(jobs.accountId, accountId))),
      db.update(jobCompensations).set({ calculatedAmountMinor: amountMinor, status: status === "paid" ? "ready_for_approval" : "pending_completion", updatedAt: now }).where(and(eq(jobCompensations.accountId, accountId), eq(jobCompensations.jobId, id))),
      db.insert(jobEvents).values({ id: crypto.randomUUID(), accountId, jobId: id, actorUserId: user.userId, eventType: "payment_recorded", fromStatus: job.status, toStatus: status, detailJson: JSON.stringify({ amountMinor, method, balanceMinor }) }),
    ]);
    const [updatedJob] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    return Response.json({ job: updatedJob });
  } catch (error) {
    return routeError(error);
  }
}
