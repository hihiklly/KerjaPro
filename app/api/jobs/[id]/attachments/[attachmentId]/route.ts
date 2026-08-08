import { and, eq } from "drizzle-orm";
import { attachments, jobs } from "../../../../../../db/schema";
import { getFilesBinding } from "../../../../../../storage";
import { ApiError, getAccountContext, routeError } from "../../../../_lib/http";

type RouteContext = { params: Promise<{ id: string; attachmentId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: jobId, attachmentId } = await context.params;
    const { db, accountId } = await getAccountContext();
    const [record] = await db.select({ storageKey: attachments.storageKey, mimeType: attachments.mimeType })
      .from(attachments)
      .innerJoin(jobs, and(eq(jobs.id, attachments.jobId), eq(jobs.accountId, accountId)))
      .where(and(eq(attachments.id, attachmentId), eq(attachments.jobId, jobId), eq(attachments.accountId, accountId))).limit(1);
    if (!record) throw new ApiError(404, "Photo not found");
    const object = await getFilesBinding().get(record.storageKey);
    if (!object) throw new ApiError(404, "Photo file not found");
    return new Response(object.body, { headers: { "content-type": record.mimeType, "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff" } });
  } catch (error) {
    return routeError(error);
  }
}
