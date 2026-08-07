import { and, desc, eq } from "drizzle-orm";
import { completionReports, customers, documents, documentVersions, invoiceItems, jobs, quotationItems } from "../../../db/schema";
import { ApiError, enumValue, getAccountContext, listOptions, optionalInteger, optionalString, readJson, requiredString, routeError } from "../_lib/http";

const DOCUMENT_KINDS = ["quotation", "work_report", "invoice"] as const;
const DOCUMENT_STATUSES = ["draft", "confirmed", "void"] as const;

export async function GET(request: Request) {
  try {
    const { db, accountId } = await getAccountContext();
    const { limit, offset } = listOptions(request);
    const params = new URL(request.url).searchParams;
    const kind = params.get("kind");
    const customerId = params.get("customerId");
    const jobId = params.get("jobId");
    if (kind && !DOCUMENT_KINDS.includes(kind as (typeof DOCUMENT_KINDS)[number])) {
      throw new ApiError(400, `kind must be one of: ${DOCUMENT_KINDS.join(", ")}`);
    }
    const rows = await db.select({ document: documents, customer: customers }).from(documents)
      .innerJoin(customers, and(eq(customers.id, documents.customerId), eq(customers.accountId, accountId)))
      .where(and(
        eq(documents.accountId, accountId),
        kind ? eq(documents.kind, kind as (typeof DOCUMENT_KINDS)[number]) : undefined,
        customerId ? eq(documents.customerId, customerId) : undefined,
        jobId ? eq(documents.jobId, jobId) : undefined,
      )).orderBy(desc(documents.createdAt)).limit(limit).offset(offset);
    return Response.json({ documents: rows, pagination: { limit, offset } });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { db, accountId } = await getAccountContext();
    const payload = await readJson(request);
    const customerId = requiredString(payload, "customerId", 100);
    const jobId = optionalString(payload, "jobId", 100);
    const [customer] = await db.select({ id: customers.id }).from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.accountId, accountId))).limit(1);
    if (!customer) throw new ApiError(400, "customerId does not belong to this workspace");
    if (jobId) {
      const [job] = await db.select({ id: jobs.id }).from(jobs).where(and(
        eq(jobs.id, jobId), eq(jobs.accountId, accountId), eq(jobs.customerId, customerId),
      )).limit(1);
      if (!job) throw new ApiError(400, "jobId does not belong to this customer and workspace");
    }

    const kind = enumValue(payload, "kind", DOCUMENT_KINDS);
    const items = parseItems(payload.items, kind);
    const calculatedSubtotal = items.reduce((sum, item) => sum + item.amountMinor, 0);
    const suppliedSubtotal = optionalInteger(payload, "subtotalMinor", { min: 0 });
    if (suppliedSubtotal !== null && suppliedSubtotal !== calculatedSubtotal) {
      throw new ApiError(400, "subtotalMinor does not match the line items");
    }
    const subtotalMinor = suppliedSubtotal ?? calculatedSubtotal;
    const taxMinor = optionalInteger(payload, "taxMinor", { min: 0 }) ?? 0;
    const totalMinor = optionalInteger(payload, "totalMinor", { min: 0 }) ?? subtotalMinor + taxMinor;
    const status = enumValue(payload, "status", DOCUMENT_STATUSES, "draft");
    if (status === "confirmed" && payload.humanVerified !== true) {
      throw new ApiError(400, "humanVerified must be true before confirming a document");
    }
    const documentId = crypto.randomUUID();
    const documentValues: typeof documents.$inferInsert = {
      id: documentId,
      accountId,
      customerId,
      jobId,
      kind,
      documentNumber: requiredString(payload, "documentNumber", 100),
      status,
      currency: optionalString(payload, "currency", 3) ?? "MYR",
      subtotalMinor,
      taxMinor,
      totalMinor,
      confirmedAt: status === "confirmed" ? new Date().toISOString() : null,
    };
    const versionValues: typeof documentVersions.$inferInsert = {
      id: crypto.randomUUID(),
      accountId,
      documentId,
      version: 1,
      contentJson: JSON.stringify(payload.content ?? {}),
      source: enumValue(payload, "source", ["manual", "ai"] as const, "manual"),
    };

    if (kind === "quotation") {
      await db.batch([
        db.insert(documents).values(documentValues),
        db.insert(documentVersions).values(versionValues),
        db.insert(quotationItems).values(items.map((item, index) => ({
          id: crypto.randomUUID(), accountId, documentId, description: item.description,
          quantityMilli: item.quantityMilli, unit: item.unit ?? "unit",
          unitPriceMinor: item.unitPriceMinor, amountMinor: item.amountMinor, sortOrder: index,
        }))),
      ]);
    } else if (kind === "invoice") {
      await db.batch([
        db.insert(documents).values(documentValues),
        db.insert(documentVersions).values(versionValues),
        db.insert(invoiceItems).values(items.map((item, index) => ({
          id: crypto.randomUUID(), accountId, documentId, description: item.description,
          quantityMilli: item.quantityMilli, unitPriceMinor: item.unitPriceMinor,
          amountMinor: item.amountMinor, sortOrder: index,
        }))),
      ]);
    } else {
      const report = parseCompletionReport(payload.report);
      await db.batch([
        db.insert(documents).values(documentValues),
        db.insert(documentVersions).values(versionValues),
        db.insert(completionReports).values({
          id: crypto.randomUUID(), accountId, documentId, ...report,
        }),
      ]);
    }

    const [document] = await db.select().from(documents).where(
      and(eq(documents.id, documentId), eq(documents.accountId, accountId)),
    ).limit(1);
    return Response.json({ document }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}

type ParsedItem = {
  description: string;
  quantityMilli: number;
  unitPriceMinor: number;
  amountMinor: number;
  unit: string | null;
};

function parseItems(value: unknown, kind: (typeof DOCUMENT_KINDS)[number]): ParsedItem[] {
  if (kind === "work_report") return [];
  if (!Array.isArray(value) || value.length === 0) {
    throw new ApiError(400, "items must contain at least one line item");
  }
  if (value.length > 100) throw new ApiError(400, "items must contain at most 100 line items");
  return value.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new ApiError(400, `items[${index}] must be an object`);
    }
    const item = raw as Record<string, unknown>;
    const description = requiredString(item, "description", 500);
    const quantityMilli = optionalInteger(item, "quantityMilli", { min: 1, max: 1_000_000_000 });
    const unitPriceMinor = optionalInteger(item, "unitPriceMinor", { min: 0, max: 1_000_000_000 });
    if (quantityMilli === null || unitPriceMinor === null) {
      throw new ApiError(400, `items[${index}] requires quantityMilli and unitPriceMinor`);
    }
    const amountMinor = Math.round(quantityMilli * unitPriceMinor / 1_000);
    if (!Number.isSafeInteger(amountMinor)) throw new ApiError(400, `items[${index}] amount is too large`);
    const suppliedAmount = optionalInteger(item, "amountMinor", { min: 0 });
    if (suppliedAmount !== null && suppliedAmount !== amountMinor) {
      throw new ApiError(400, `items[${index}].amountMinor is incorrect`);
    }
    return {
      description,
      quantityMilli,
      unitPriceMinor,
      amountMinor,
      unit: kind === "quotation" ? requiredString(item, "unit", 50) : null,
    };
  });
}

function parseCompletionReport(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "report is required for a work_report document");
  }
  const report = value as Record<string, unknown>;
  return {
    serviceDate: requiredString(report, "serviceDate", 50),
    findings: requiredString(report, "findings", 5_000),
    workPerformed: requiredString(report, "workPerformed", 5_000),
    testingResults: optionalString(report, "testingResults", 5_000),
    warranty: optionalString(report, "warranty", 1_000),
    recommendations: optionalString(report, "recommendations", 5_000),
    technician: requiredString(report, "technician", 200),
  };
}
