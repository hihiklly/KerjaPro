import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { customerPayments, customers, documents, documentVersions, jobEvents, jobLineItems, jobs, quotationItems } from "../../../db/schema";
import { ApiError, getAccountContext, listOptions, optionalInteger, optionalString, readJson, requiredString, routeError } from "../_lib/http";
import { jobTotals, nextNumber, parseJobItems } from "./_shared";

export async function GET(request: Request) {
  try {
    const { db, accountId } = await getAccountContext();
    const { limit, offset } = listOptions(request);
    const rows = await db.select({ job: jobs, customer: customers }).from(jobs)
      .innerJoin(customers, and(eq(customers.id, jobs.customerId), eq(customers.accountId, accountId)))
      .where(and(eq(jobs.accountId, accountId), isNull(customers.deletedAt)))
      .orderBy(desc(jobs.updatedAt)).limit(limit).offset(offset);
    const ids = rows.map(row => row.job.id);
    if (!ids.length) return Response.json({ jobs: [], pagination: { limit, offset } });
    const [items, docs] = await Promise.all([
      db.select().from(jobLineItems).where(and(eq(jobLineItems.accountId, accountId), inArray(jobLineItems.jobId, ids))),
      db.select().from(documents).where(and(eq(documents.accountId, accountId), inArray(documents.jobId, ids))),
    ]);
    const invoiceIds = docs.filter(doc => doc.kind === "invoice").map(doc => doc.id);
    const received = invoiceIds.length ? await db.select().from(customerPayments).where(and(eq(customerPayments.accountId, accountId), inArray(customerPayments.invoiceDocumentId, invoiceIds))) : [];
    const result = rows.map(row => {
      const jobDocuments = docs.filter(doc => doc.jobId === row.job.id);
      const jobInvoiceIds = new Set(jobDocuments.filter(doc => doc.kind === "invoice").map(doc => doc.id));
      const paidMinor = received.filter(payment => jobInvoiceIds.has(payment.invoiceDocumentId) && !payment.reversedAt).reduce((sum, payment) => sum + payment.amountMinor, 0);
      return { ...row, items: items.filter(item => item.jobId === row.job.id).sort((a, b) => a.sortOrder - b.sortOrder), documents: jobDocuments, paidMinor };
    });
    return Response.json({ jobs: result, pagination: { limit, offset } });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { db, accountId, user } = await getAccountContext();
    const payload = await readJson(request);
    const customerId = requiredString(payload, "customerId", 100);
    const [customer] = await db.select().from(customers).where(and(eq(customers.id, customerId), eq(customers.accountId, accountId), isNull(customers.deletedAt))).limit(1);
    if (!customer) throw new ApiError(400, "Select a customer from this workspace");
    const items = parseJobItems(payload.items);
    const discountMinor = optionalInteger(payload, "discountMinor", { min: 0, max: 1_000_000_000 }) ?? 0;
    const totals = jobTotals(items, discountMinor);
    const jobId = crypto.randomUUID();
    const documentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const jobNumber = nextNumber("JOB");
    const documentNumber = nextNumber("Q");
    const category = [...new Set(items.map(item => item.itemType))].join(", ");
    await db.batch([
      db.insert(jobs).values({ id: jobId, accountId, customerId, jobNumber, category, serviceAddress: optionalString(payload, "serviceAddress", 1_000) ?? customer.serviceAddress, request: optionalString(payload, "request", 5_000) ?? items.map(item => item.description).join(", "), internalNotes: optionalString(payload, "internalNotes", 5_000), status: "draft", discountMinor, ...totals, balanceMinor: totals.totalMinor }),
      db.insert(jobLineItems).values(items.map((item, index) => ({ ...item, accountId, jobId, sortOrder: index }))),
      db.insert(documents).values({ id: documentId, accountId, customerId, jobId, kind: "quotation", documentNumber, status: "draft", subtotalMinor: totals.subtotalMinor, taxMinor: totals.taxMinor, totalMinor: totals.totalMinor }),
      db.insert(documentVersions).values({ id: crypto.randomUUID(), accountId, documentId, version: 1, source: "manual", contentJson: JSON.stringify({ discountMinor, createdFrom: "job-menu" }) }),
      db.insert(quotationItems).values(items.map((item, index) => ({ id: crypto.randomUUID(), accountId, documentId, description: item.description, quantityMilli: item.quantityMilli, unit: item.unit, unitPriceMinor: item.unitPriceMinor, amountMinor: item.amountMinor, sortOrder: index }))),
      db.insert(jobEvents).values({ id: crypto.randomUUID(), accountId, jobId, actorUserId: user.userId, eventType: "job_created", toStatus: "draft", detailJson: JSON.stringify({ documentNumber }), createdAt: now }),
    ]);
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    return Response.json({ job, quote: { id: documentId, documentNumber } }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
