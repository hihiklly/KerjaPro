import { and, asc, desc, eq, inArray, max } from "drizzle-orm";
import { attachments, businessMembers, completionReports, customerPayments, customers, documents, documentVersions, invoiceItems, jobAssignments, jobCompensations, jobEvents, jobLineItems, jobs, quotationItems, users } from "../../../../db/schema";
import { ApiError, enumValue, getAccountContext, optionalInteger, optionalString, readJson, requiredString, routeError } from "../../_lib/http";
import { JOB_STATUSES, JobStatus, jobTotals, nextNumber, parseJobItems } from "../_shared";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { db, accountId } = await getAccountContext();
    const [record] = await db.select({ job: jobs, customer: customers }).from(jobs).innerJoin(customers, and(eq(customers.id, jobs.customerId), eq(customers.accountId, accountId))).where(and(eq(jobs.id, id), eq(jobs.accountId, accountId))).limit(1);
    if (!record) throw new ApiError(404, "Job not found");
    const [items, jobDocuments, events, photos] = await Promise.all([
      db.select().from(jobLineItems).where(and(eq(jobLineItems.accountId, accountId), eq(jobLineItems.jobId, id))).orderBy(asc(jobLineItems.sortOrder)),
      db.select().from(documents).where(and(eq(documents.accountId, accountId), eq(documents.jobId, id))).orderBy(desc(documents.createdAt)),
      db.select().from(jobEvents).where(and(eq(jobEvents.accountId, accountId), eq(jobEvents.jobId, id))).orderBy(desc(jobEvents.createdAt)),
      db.select({ id: attachments.id, fileName: attachments.fileName, mimeType: attachments.mimeType, sizeBytes: attachments.sizeBytes, createdAt: attachments.createdAt }).from(attachments).where(and(eq(attachments.accountId, accountId), eq(attachments.jobId, id))).orderBy(asc(attachments.createdAt)),
    ]);
    const financialDocumentIds = jobDocuments.filter(document => document.kind === "invoice" || document.kind === "quotation").map(document => document.id);
    const payments = financialDocumentIds.length ? await db.select().from(customerPayments).where(and(eq(customerPayments.accountId, accountId), inArray(customerPayments.invoiceDocumentId, financialDocumentIds))).orderBy(desc(customerPayments.receivedAt)) : [];
    return Response.json({ ...record, items, documents: jobDocuments, events, payments, attachments: photos });
  } catch (error) {
    return routeError(error);
  }
}

const TRANSITIONS: Record<string, { from: JobStatus[]; to: JobStatus }> = {
  send_quote: { from: ["draft"], to: "quote_sent" },
  accept_quote: { from: ["quote_sent"], to: "quote_accepted" },
  schedule: { from: ["quote_accepted"], to: "scheduled" },
  start: { from: ["scheduled"], to: "in_progress" },
  complete: { from: ["in_progress"], to: "completed" },
  cancel: { from: ["draft", "quote_sent", "quote_accepted", "scheduled", "in_progress"], to: "cancelled" },
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { db, accountId, memberId, user } = await getAccountContext();
    const payload = await readJson(request);
    const [existing] = await db.select().from(jobs).where(and(eq(jobs.id, id), eq(jobs.accountId, accountId))).limit(1);
    if (!existing) throw new ApiError(404, "Job not found");
    const action = requiredString(payload, "action", 50);

    if (action === "add_items") {
      if (!["draft", "quote_sent", "quote_accepted", "scheduled", "in_progress"].includes(existing.status)) throw new ApiError(409, "Items cannot be added at this stage");
      const newItems = parseJobItems(payload.items);
      const currentItems = await db.select().from(jobLineItems).where(and(eq(jobLineItems.accountId, accountId), eq(jobLineItems.jobId, id)));
      const allItems = [...currentItems.map(item => ({ ...item, catalogItemId: item.catalogItemId ?? null, costMinor: item.costMinor ?? null, commissionBasisPoints: item.commissionBasisPoints ?? null })), ...newItems];
      const totals = jobTotals(allItems, existing.discountMinor);
      const alreadyPaidMinor = Math.max(0, existing.totalMinor - existing.balanceMinor);
      const [quote] = await db.select().from(documents).where(and(eq(documents.accountId, accountId), eq(documents.jobId, id), eq(documents.kind, "quotation"))).limit(1);
      const [latestQuoteVersion] = quote ? await db.select({ value: max(documentVersions.version) }).from(documentVersions).where(and(eq(documentVersions.accountId, accountId), eq(documentVersions.documentId, quote.id))) : [{ value: 0 }];
      const changes: unknown[] = [
        db.insert(jobLineItems).values(newItems.map((item, index) => ({ ...item, accountId, jobId: id, sortOrder: currentItems.length + index, addedDuringJob: true }))),
        db.update(jobs).set({ ...totals, balanceMinor: Math.max(0, totals.totalMinor - alreadyPaidMinor), updatedAt: new Date().toISOString() }).where(and(eq(jobs.id, id), eq(jobs.accountId, accountId))),
        db.insert(jobEvents).values({ id: crypto.randomUUID(), accountId, jobId: id, actorUserId: user.userId, eventType: "items_added", detailJson: JSON.stringify({ count: newItems.length, totalMinor: totals.totalMinor }) }),
      ];
      if (quote) changes.push(
        db.update(documents).set({ subtotalMinor: totals.subtotalMinor, taxMinor: totals.taxMinor, totalMinor: totals.totalMinor, updatedAt: new Date().toISOString() }).where(and(eq(documents.id, quote.id), eq(documents.accountId, accountId))),
        db.insert(documentVersions).values({ id: crypto.randomUUID(), accountId, documentId: quote.id, version: (latestQuoteVersion?.value ?? 0) + 1, source: "manual", contentJson: JSON.stringify({ change: "items_added", count: newItems.length, totalMinor: totals.totalMinor }) }),
        db.insert(quotationItems).values(newItems.map((item, index) => ({ id: crypto.randomUUID(), accountId, documentId: quote.id, description: item.description, remarks: item.remarks, quantityMilli: item.quantityMilli, unit: item.unit, unitPriceMinor: item.unitPriceMinor, amountMinor: item.amountMinor, sortOrder: currentItems.length + index }))),
      );
      await db.batch(changes as unknown as Parameters<typeof db.batch>[0]);
      const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
      return Response.json({ job });
    }

    if (action === "change_discount") {
      if (!["draft", "quote_sent", "quote_accepted", "scheduled", "in_progress"].includes(existing.status)) throw new ApiError(409, "The quote can no longer be changed");
      const discountMinor = optionalInteger(payload, "discountMinor", { min: 0, max: existing.subtotalMinor });
      if (discountMinor === null) throw new ApiError(400, "discountMinor is required");
      const totalMinor = Math.max(0, existing.subtotalMinor - discountMinor + existing.taxMinor);
      const [quote] = await db.select({ id: documents.id }).from(documents).where(and(eq(documents.accountId, accountId), eq(documents.jobId, id), eq(documents.kind, "quotation"))).limit(1);
      const [latestQuoteVersion] = quote ? await db.select({ value: max(documentVersions.version) }).from(documentVersions).where(and(eq(documentVersions.accountId, accountId), eq(documentVersions.documentId, quote.id))) : [{ value: 0 }];
      const changes: unknown[] = [
        db.update(jobs).set({ discountMinor, totalMinor, balanceMinor: Math.max(0, totalMinor - (existing.totalMinor - existing.balanceMinor)), updatedAt: new Date().toISOString() }).where(and(eq(jobs.id, id), eq(jobs.accountId, accountId))),
        db.update(documents).set({ totalMinor, updatedAt: new Date().toISOString() }).where(and(eq(documents.accountId, accountId), eq(documents.jobId, id), eq(documents.kind, "quotation"))),
        db.insert(jobEvents).values({ id: crypto.randomUUID(), accountId, jobId: id, actorUserId: user.userId, eventType: "discount_changed", detailJson: JSON.stringify({ discountMinor, totalMinor }) }),
      ];
      if (quote) changes.push(db.insert(documentVersions).values({ id: crypto.randomUUID(), accountId, documentId: quote.id, version: (latestQuoteVersion?.value ?? 0) + 1, source: "manual", contentJson: JSON.stringify({ change: "discount_changed", discountMinor, totalMinor }) }));
      await db.batch(changes as unknown as Parameters<typeof db.batch>[0]);
      const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
      return Response.json({ job });
    }

    if (action === "update_details") {
      const [job] = await db.update(jobs).set({ internalNotes: optionalString(payload, "notes", 5_000) ?? existing.internalNotes, warrantyUntil: optionalString(payload, "warrantyUntil", 50) ?? existing.warrantyUntil, updatedAt: new Date().toISOString() }).where(and(eq(jobs.id, id), eq(jobs.accountId, accountId))).returning();
      await db.insert(jobEvents).values({ id: crypto.randomUUID(), accountId, jobId: id, actorUserId: user.userId, eventType: "details_updated", detailJson: JSON.stringify(payload) });
      return Response.json({ job });
    }

    if (action === "reschedule") {
      if (!["scheduled", "in_progress"].includes(existing.status)) throw new ApiError(409, "This job cannot be rescheduled now");
      const appointmentAt = requiredString(payload, "appointmentAt", 50);
      const assignedMemberId = optionalString(payload, "assignedMemberId", 100) ?? existing.assignedMemberId;
      let technician = existing.technician;
      if (assignedMemberId) {
        const [assignee] = await db.select({ id: businessMembers.id, email: users.email }).from(businessMembers).innerJoin(users, eq(users.id, businessMembers.userId)).where(and(eq(businessMembers.id, assignedMemberId), eq(businessMembers.accountId, accountId), eq(businessMembers.status, "active"))).limit(1);
        if (!assignee) throw new ApiError(400, "Select an active team member from this workspace");
        technician = assignee.email.split("@")[0].replace(/[._-]+/g, " ");
      }
      const now = new Date().toISOString();
      const changes: unknown[] = [
        db.update(jobs).set({ appointmentAt, assignedMemberId, technician, updatedAt: now }).where(and(eq(jobs.id, id), eq(jobs.accountId, accountId))),
        db.insert(jobEvents).values({ id: crypto.randomUUID(), accountId, jobId: id, actorUserId: user.userId, eventType: "rescheduled", detailJson: JSON.stringify({ appointmentAt, assignedMemberId }) }),
      ];
      if (assignedMemberId && assignedMemberId !== existing.assignedMemberId) changes.push(
        db.update(jobAssignments).set({ endedAt: now, endReason: "rescheduled" }).where(and(eq(jobAssignments.accountId, accountId), eq(jobAssignments.jobId, id))),
        db.insert(jobAssignments).values({ id: crypto.randomUUID(), accountId, jobId: id, assignedMemberId, assignedByMemberId: memberId, appointmentAt, priority: "normal", notifiedAt: now }),
      );
      await db.batch(changes as unknown as Parameters<typeof db.batch>[0]);
      const [job] = await db.select().from(jobs).where(and(eq(jobs.id, id), eq(jobs.accountId, accountId))).limit(1);
      return Response.json({ job });
    }

    const transition = TRANSITIONS[action];
    if (!transition || !transition.from.includes(existing.status as JobStatus)) throw new ApiError(409, `Action ${action} is not available for a ${existing.status} job`);
    const now = new Date().toISOString();
    const updates: Partial<typeof jobs.$inferInsert> = { status: transition.to, updatedAt: now };
    if (action === "send_quote") updates.quoteSentAt = now;
    if (action === "accept_quote") updates.quoteAcceptedAt = now;
    if (action === "schedule") {
      updates.appointmentAt = requiredString(payload, "appointmentAt", 50);
      const assignedMemberId = optionalString(payload, "assignedMemberId", 100);
      if (assignedMemberId) {
        const [assignee] = await db.select({ id: businessMembers.id, email: users.email }).from(businessMembers).innerJoin(users, eq(users.id, businessMembers.userId)).where(and(eq(businessMembers.id, assignedMemberId), eq(businessMembers.accountId, accountId), eq(businessMembers.status, "active"))).limit(1);
        if (!assignee) throw new ApiError(400, "Select an active team member from this workspace");
        updates.assignedMemberId = assignee.id;
        updates.technician = assignee.email.split("@")[0].replace(/[._-]+/g, " ");
      }
    }
    if (action === "start") updates.startedAt = now;
    if (action === "complete") { updates.completedAt = now; if (existing.balanceMinor === 0) { updates.status = "paid"; updates.closedAt = now; } }
    if (action === "cancel") updates.cancellationReason = requiredString(payload, "reason", 1_000);

    const statements: unknown[] = [
      db.update(jobs).set(updates).where(and(eq(jobs.id, id), eq(jobs.accountId, accountId))),
      db.insert(jobEvents).values({ id: crypto.randomUUID(), accountId, jobId: id, actorUserId: user.userId, eventType: action, fromStatus: existing.status, toStatus: updates.status ?? transition.to, detailJson: JSON.stringify(payload) }),
    ];
    if (action === "schedule" && updates.assignedMemberId) statements.push(db.insert(jobAssignments).values({ id: crypto.randomUUID(), accountId, jobId: id, assignedMemberId: updates.assignedMemberId, assignedByMemberId: memberId, appointmentAt: updates.appointmentAt, priority: "normal", notifiedAt: now }));
    if (action === "send_quote") statements.push(db.update(documents).set({ status: "confirmed", confirmedAt: now, updatedAt: now }).where(and(eq(documents.accountId, accountId), eq(documents.jobId, id), eq(documents.kind, "quotation"))));
    if (action === "complete") {
      const items = await db.select().from(jobLineItems).where(and(eq(jobLineItems.accountId, accountId), eq(jobLineItems.jobId, id))).orderBy(asc(jobLineItems.sortOrder));
      const [quote] = await db.select({ id: documents.id }).from(documents).where(and(eq(documents.accountId, accountId), eq(documents.jobId, id), eq(documents.kind, "quotation"))).limit(1);
      const reportId = crypto.randomUUID();
      const invoiceId = crypto.randomUUID();
      const reportNumber = nextNumber("WR");
      const invoiceNumber = nextNumber("INV");
      statements.push(
        db.insert(documents).values({ id: reportId, accountId, customerId: existing.customerId, jobId: id, kind: "work_report", documentNumber: reportNumber, status: "confirmed", confirmedAt: now }),
        db.insert(documentVersions).values({ id: crypto.randomUUID(), accountId, documentId: reportId, version: 1, source: "manual", contentJson: JSON.stringify({ automaticallyGenerated: true }) }),
        db.insert(completionReports).values({ id: crypto.randomUUID(), accountId, documentId: reportId, serviceDate: now.slice(0, 10), findings: optionalString(payload, "findings", 5_000) ?? "Job completed as scheduled.", workPerformed: optionalString(payload, "workPerformed", 5_000) ?? items.map(item => item.description).join(", "), testingResults: optionalString(payload, "testingResults", 5_000), warranty: optionalString(payload, "warranty", 1_000), recommendations: optionalString(payload, "notes", 5_000), technician: existing.technician ?? user.displayName }),
        db.insert(documents).values({ id: invoiceId, accountId, customerId: existing.customerId, jobId: id, kind: "invoice", documentNumber: invoiceNumber, status: "confirmed", subtotalMinor: existing.subtotalMinor, taxMinor: existing.taxMinor, totalMinor: existing.totalMinor, confirmedAt: now }),
        db.insert(documentVersions).values({ id: crypto.randomUUID(), accountId, documentId: invoiceId, version: 1, source: "manual", contentJson: JSON.stringify({ automaticallyGenerated: true, reportNumber }) }),
        db.insert(invoiceItems).values(items.map((item, index) => ({ id: crypto.randomUUID(), accountId, documentId: invoiceId, description: item.description, quantityMilli: item.quantityMilli, unitPriceMinor: item.unitPriceMinor, amountMinor: item.amountMinor, sortOrder: index }))),
      );
      if (quote) statements.push(db.update(customerPayments).set({ invoiceDocumentId: invoiceId, updatedAt: now }).where(and(eq(customerPayments.accountId, accountId), eq(customerPayments.invoiceDocumentId, quote.id))));
      if (existing.balanceMinor === 0) statements.push(db.update(jobCompensations).set({ status: "ready_for_approval", updatedAt: now }).where(and(eq(jobCompensations.accountId, accountId), eq(jobCompensations.jobId, id))));
    }
    await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
    const [job] = await db.select().from(jobs).where(and(eq(jobs.id, id), eq(jobs.accountId, accountId))).limit(1);
    return Response.json({ job });
  } catch (error) {
    return routeError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { db, accountId } = await getAccountContext();
    const payload = await readJson(request);
    const status = enumValue(payload, "status", JOB_STATUSES);
    const [job] = await db.update(jobs).set({ status, updatedAt: new Date().toISOString() }).where(and(eq(jobs.id, id), eq(jobs.accountId, accountId))).returning();
    if (!job) throw new ApiError(404, "Job not found");
    return Response.json({ job });
  } catch (error) {
    return routeError(error);
  }
}
