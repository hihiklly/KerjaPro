import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { attachments, customerPayments, customers, documents, documentVersions, jobEvents, jobLineItems, jobs, quotationItems } from "../../../db/schema";
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
    const [items, docs, photos] = await Promise.all([
      db.select().from(jobLineItems).where(and(eq(jobLineItems.accountId, accountId), inArray(jobLineItems.jobId, ids))),
      db.select().from(documents).where(and(eq(documents.accountId, accountId), inArray(documents.jobId, ids))),
      db.select({ id: attachments.id, jobId: attachments.jobId, fileName: attachments.fileName, mimeType: attachments.mimeType, sizeBytes: attachments.sizeBytes, createdAt: attachments.createdAt }).from(attachments).where(and(eq(attachments.accountId, accountId), inArray(attachments.jobId, ids))),
    ]);
    const financialDocumentIds = docs.filter(doc => doc.kind === "invoice" || doc.kind === "quotation").map(doc => doc.id);
    const received = financialDocumentIds.length ? await db.select().from(customerPayments).where(and(eq(customerPayments.accountId, accountId), inArray(customerPayments.invoiceDocumentId, financialDocumentIds))) : [];
    const result = rows.map(row => {
      const jobDocuments = docs.filter(doc => doc.jobId === row.job.id);
      const jobFinancialDocumentIds = new Set(jobDocuments.filter(doc => doc.kind === "invoice" || doc.kind === "quotation").map(doc => doc.id));
      const paidMinor = received.filter(payment => jobFinancialDocumentIds.has(payment.invoiceDocumentId) && !payment.reversedAt).reduce((sum, payment) => sum + payment.amountMinor, 0);
      return { ...row, items: items.filter(item => item.jobId === row.job.id).sort((a, b) => a.sortOrder - b.sortOrder), documents: jobDocuments, attachments: photos.filter(photo => photo.jobId === row.job.id), paidMinor };
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
    let customerId = optionalString(payload, "customerId", 100);
    let customer: { id: string; name: string; phone: string; serviceAddress: string } | undefined;
    let newCustomer: typeof customers.$inferInsert | null = null;
    if (customerId) {
      [customer] = await db.select({ id: customers.id, name: customers.name, phone: customers.phone, serviceAddress: customers.serviceAddress }).from(customers).where(and(eq(customers.id, customerId), eq(customers.accountId, accountId), isNull(customers.deletedAt))).limit(1);
      if (!customer) throw new ApiError(400, "Select a customer from this workspace");
    } else {
      const raw = payload.customer;
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ApiError(400, "Choose an existing customer or enter a new customer");
      const details = raw as Record<string, unknown>;
      const phone = requiredString(details, "phone", 50);
      [customer] = await db.select({ id: customers.id, name: customers.name, phone: customers.phone, serviceAddress: customers.serviceAddress }).from(customers).where(and(eq(customers.accountId, accountId), eq(customers.phone, phone), isNull(customers.deletedAt))).limit(1);
      if (customer) customerId = customer.id;
      else {
        customerId = crypto.randomUUID();
        newCustomer = { id: customerId, accountId, name: requiredString(details, "name", 200), phone, whatsapp: optionalString(details, "whatsapp", 50) ?? phone, email: optionalString(details, "email", 320), serviceAddress: requiredString(details, "serviceAddress", 1_000), notes: optionalString(details, "notes", 5_000) };
        customer = { id: customerId, name: newCustomer.name, phone: newCustomer.phone, serviceAddress: newCustomer.serviceAddress };
      }
    }
    if (!customer || !customerId) throw new ApiError(400, "Customer details are incomplete");
    const items = parseJobItems(payload.items);
    const discountMinor = optionalInteger(payload, "discountMinor", { min: 0, max: 1_000_000_000 }) ?? 0;
    const totals = jobTotals(items, discountMinor);
    const jobId = crypto.randomUUID();
    const documentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const jobNumber = nextNumber("JOB");
    const documentNumber = nextNumber("Q");
    const category = [...new Set(items.map(item => item.itemType))].join(", ");
    const statements: unknown[] = [
      db.insert(jobs).values({ id: jobId, accountId, customerId, jobNumber, category, serviceAddress: optionalString(payload, "serviceAddress", 1_000) ?? customer.serviceAddress, request: optionalString(payload, "request", 5_000) ?? items.map(item => item.description).join(", "), internalNotes: optionalString(payload, "internalNotes", 5_000), status: "draft", discountMinor, ...totals, balanceMinor: totals.totalMinor }),
      db.insert(jobLineItems).values(items.map((item, index) => ({ ...item, accountId, jobId, sortOrder: index }))),
      db.insert(documents).values({ id: documentId, accountId, customerId, jobId, kind: "quotation", documentNumber, status: "draft", subtotalMinor: totals.subtotalMinor, taxMinor: totals.taxMinor, totalMinor: totals.totalMinor }),
      db.insert(documentVersions).values({ id: crypto.randomUUID(), accountId, documentId, version: 1, source: "manual", contentJson: JSON.stringify({ discountMinor, createdFrom: "job-menu" }) }),
      db.insert(quotationItems).values(items.map((item, index) => ({ id: crypto.randomUUID(), accountId, documentId, description: item.description, remarks: item.remarks, quantityMilli: item.quantityMilli, unit: item.unit, unitPriceMinor: item.unitPriceMinor, amountMinor: item.amountMinor, sortOrder: index }))),
      db.insert(jobEvents).values({ id: crypto.randomUUID(), accountId, jobId, actorUserId: user.userId, eventType: "job_created", toStatus: "draft", detailJson: JSON.stringify({ documentNumber }), createdAt: now }),
    ];
    if (newCustomer) statements.unshift(db.insert(customers).values(newCustomer));
    await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    return Response.json({ job, customer, quote: { id: documentId, documentNumber } }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
