import { and, desc, eq, max } from "drizzle-orm";
import { customerPayments, documents, documentVersions, jobAssignments, jobCompensations, jobEvents, jobLineItems, jobs, staffPayRules } from "../../../../../db/schema";
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
    const paymentId = crypto.randomUUID();
    const receiptId = crypto.randomUUID();
    const receiptNumber = nextNumber("RCP");
    const [latestVersion] = await db.select({ value: max(documentVersions.version) }).from(documentVersions).where(and(eq(documentVersions.accountId, accountId), eq(documentVersions.documentId, invoice.id)));
    const statements: unknown[] = [
      db.insert(customerPayments).values({ id: paymentId, accountId, customerId: job.customerId, invoiceDocumentId: invoice.id, receiptNumber, amountMinor, method, reference: optionalString(payload, "reference", 200), receivedAt: now, recordedByUserId: user.userId, idempotencyKey: crypto.randomUUID() }),
      db.update(jobs).set({ balanceMinor, status, closedAt: status === "paid" ? now : job.closedAt, updatedAt: now }).where(and(eq(jobs.id, id), eq(jobs.accountId, accountId))),
      db.update(documents).set({ updatedAt: now }).where(and(eq(documents.id, invoice.id), eq(documents.accountId, accountId))),
      db.insert(documentVersions).values({ id: crypto.randomUUID(), accountId, documentId: invoice.id, version: (latestVersion?.value ?? 0) + 1, source: "manual", contentJson: JSON.stringify({ paymentId, receiptNumber, amountMinor, method, balanceMinor, receivedAt: now }) }),
      db.insert(documents).values({ id: receiptId, accountId, customerId: job.customerId, jobId: id, kind: "receipt", documentNumber: receiptNumber, status: "confirmed", subtotalMinor: amountMinor, totalMinor: amountMinor, confirmedAt: now }),
      db.insert(documentVersions).values({ id: crypto.randomUUID(), accountId, documentId: receiptId, version: 1, source: "manual", contentJson: JSON.stringify({ paymentId, invoiceDocumentId: invoice.id, amountMinor, method, balanceMinor, receivedAt: now }) }),
      db.insert(jobEvents).values({ id: crypto.randomUUID(), accountId, jobId: id, actorUserId: user.userId, eventType: "payment_recorded", fromStatus: job.status, toStatus: status, detailJson: JSON.stringify({ paymentId, receiptNumber, amountMinor, method, balanceMinor }) }),
    ];

    const [assignment] = await db.select().from(jobAssignments).where(and(eq(jobAssignments.accountId, accountId), eq(jobAssignments.jobId, id))).orderBy(desc(jobAssignments.createdAt)).limit(1);
    if (assignment) {
      const [rule] = await db.select().from(staffPayRules).where(and(eq(staffPayRules.accountId, accountId), eq(staffPayRules.memberId, assignment.assignedMemberId), eq(staffPayRules.active, true))).limit(1);
      const lines = await db.select({ amountMinor: jobLineItems.amountMinor, commissionBasisPoints: jobLineItems.commissionBasisPoints }).from(jobLineItems).where(and(eq(jobLineItems.accountId, accountId), eq(jobLineItems.jobId, id)));
      const itemCommissionMinor = lines.reduce((sum, line) => sum + Math.round(line.amountMinor * (line.commissionBasisPoints ?? 0) / 10_000), 0);
      const calculatedAmountMinor = rule?.payType === "flat_per_job"
        ? rule.flatAmountMinor ?? 0
        : rule?.payType === "commission_percentage"
          ? Math.round(job.totalMinor * (rule.commissionBasisPoints ?? 0) / 10_000)
          : itemCommissionMinor;
      const commissionEnabled = Boolean(rule || lines.some(line => (line.commissionBasisPoints ?? 0) > 0));
      if (commissionEnabled) {
        const [existingCompensation] = await db.select({ id: jobCompensations.id }).from(jobCompensations).where(and(eq(jobCompensations.accountId, accountId), eq(jobCompensations.assignmentId, assignment.id), eq(jobCompensations.memberId, assignment.assignedMemberId))).limit(1);
        const compensationStatus = status === "paid" ? "ready_for_approval" as const : "pending_completion" as const;
        if (existingCompensation) statements.push(db.update(jobCompensations).set({ payType: rule?.payType ?? "commission_percentage", amountMinor: rule?.flatAmountMinor ?? (rule ? null : calculatedAmountMinor), commissionBasisPoints: rule?.commissionBasisPoints ?? null, calculatedAmountMinor, status: compensationStatus, updatedAt: now }).where(eq(jobCompensations.id, existingCompensation.id)));
        else statements.push(db.insert(jobCompensations).values({ id: crypto.randomUUID(), accountId, jobId: id, assignmentId: assignment.id, memberId: assignment.assignedMemberId, payType: rule?.payType ?? "commission_percentage", amountMinor: rule?.flatAmountMinor ?? (rule ? null : calculatedAmountMinor), commissionBasisPoints: rule?.commissionBasisPoints ?? null, calculatedAmountMinor, status: compensationStatus }));
      }
    }

    await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
    const [updatedJob] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    return Response.json({ job: updatedJob });
  } catch (error) {
    return routeError(error);
  }
}
