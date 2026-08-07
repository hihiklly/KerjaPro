import { and, asc, desc, eq, max } from "drizzle-orm";
import { completionReports, documentVersions, documents, invoiceItems, quotationItems } from "../../../../db/schema";
import { ApiError, enumValue, getAccountContext, readJson, routeError } from "../../_lib/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { db, accountId } = await getAccountContext();
    const [document] = await db.select().from(documents).where(
      and(eq(documents.id, id), eq(documents.accountId, accountId)),
    ).limit(1);
    if (!document) throw new ApiError(404, "Document not found");

    const [versions, quoteLines, invoiceLines, report] = await Promise.all([
      db.select().from(documentVersions).where(and(eq(documentVersions.accountId, accountId), eq(documentVersions.documentId, id))).orderBy(desc(documentVersions.version)),
      db.select().from(quotationItems).where(and(eq(quotationItems.accountId, accountId), eq(quotationItems.documentId, id))).orderBy(asc(quotationItems.sortOrder)),
      db.select().from(invoiceItems).where(and(eq(invoiceItems.accountId, accountId), eq(invoiceItems.documentId, id))).orderBy(asc(invoiceItems.sortOrder)),
      db.select().from(completionReports).where(and(eq(completionReports.accountId, accountId), eq(completionReports.documentId, id))).limit(1),
    ]);
    const items = document.kind === "quotation" ? quoteLines : document.kind === "invoice" ? invoiceLines : [];
    return Response.json({ document, versions, items, completionReport: report[0] ?? null });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { db, accountId } = await getAccountContext();
    const payload = await readJson(request);
    const [existing] = await db.select().from(documents).where(
      and(eq(documents.id, id), eq(documents.accountId, accountId)),
    ).limit(1);
    if (!existing) throw new ApiError(404, "Document not found");

    const status = enumValue(payload, "status", ["draft", "confirmed", "void"] as const);
    if (existing.status !== "draft" && status === "draft") {
      throw new ApiError(409, "A confirmed or void document cannot return to draft");
    }
    if (status === "confirmed" && payload.humanVerified !== true) {
      throw new ApiError(400, "humanVerified must be true before confirming a document");
    }
    const now = new Date().toISOString();
    const [document] = await db.update(documents).set({
      status,
      confirmedAt: status === "confirmed" ? existing.confirmedAt ?? now : existing.confirmedAt,
      updatedAt: now,
    }).where(and(eq(documents.id, id), eq(documents.accountId, accountId))).returning();
    return Response.json({ document });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { db, accountId } = await getAccountContext();
    const payload = await readJson(request);
    const [document] = await db.select({ id: documents.id, status: documents.status })
      .from(documents).where(and(eq(documents.id, id), eq(documents.accountId, accountId))).limit(1);
    if (!document) throw new ApiError(404, "Document not found");
    if (document.status !== "draft") throw new ApiError(409, "Only draft documents can receive a new version");
    if (!("content" in payload)) throw new ApiError(400, "content is required");

    const [latest] = await db.select({ value: max(documentVersions.version) })
      .from(documentVersions).where(and(
        eq(documentVersions.accountId, accountId),
        eq(documentVersions.documentId, id),
      ));
    const [version] = await db.insert(documentVersions).values({
      id: crypto.randomUUID(),
      accountId,
      documentId: id,
      version: (latest?.value ?? 0) + 1,
      contentJson: JSON.stringify(payload.content),
      source: enumValue(payload, "source", ["manual", "ai"] as const, "manual"),
    }).returning();
    return Response.json({ version }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
