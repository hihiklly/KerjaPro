import { and, asc, eq } from "drizzle-orm";
import { attachments, jobEvents, jobs } from "../../../../../db/schema";
import { getFilesBinding } from "../../../../../storage";
import { ApiError, getAccountContext, routeError } from "../../../_lib/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { db, accountId } = await getAccountContext();
    const [job] = await db.select({ id: jobs.id }).from(jobs).where(and(eq(jobs.id, id), eq(jobs.accountId, accountId))).limit(1);
    if (!job) throw new ApiError(404, "Job not found");
    const photos = await db.select({ id: attachments.id, fileName: attachments.fileName, mimeType: attachments.mimeType, sizeBytes: attachments.sizeBytes, createdAt: attachments.createdAt })
      .from(attachments).where(and(eq(attachments.accountId, accountId), eq(attachments.jobId, id))).orderBy(asc(attachments.createdAt));
    return Response.json({ attachments: photos });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  let uploadedKey: string | null = null;
  let files: R2Bucket | null = null;
  try {
    const { id: jobId } = await context.params;
    const { db, accountId, user } = await getAccountContext();
    const [job] = await db.select({ id: jobs.id, status: jobs.status }).from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.accountId, accountId))).limit(1);
    if (!job) throw new ApiError(404, "Job not found");
    if (["paid", "cancelled"].includes(job.status)) throw new ApiError(409, "Photos cannot be added to a closed job");

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "Choose a photo to upload");
    if (!file.type.startsWith("image/")) throw new ApiError(400, "Only image files can be added as job photos");
    if (file.size === 0 || file.size > 12 * 1024 * 1024) throw new ApiError(400, "Each photo must be between 1 byte and 12 MB");

    const attachmentId = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "job-photo";
    uploadedKey = `${accountId}/jobs/${jobId}/${attachmentId}-${safeName}`;
    files = getFilesBinding();
    await files.put(uploadedKey, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { accountId, jobId, attachmentId },
    });

    await db.batch([
      db.insert(attachments).values({ id: attachmentId, accountId, jobId, storageKey: uploadedKey, fileName: file.name.slice(0, 255), mimeType: file.type, sizeBytes: file.size }),
      db.insert(jobEvents).values({ id: crypto.randomUUID(), accountId, jobId, actorUserId: user.userId, eventType: "photo_added", detailJson: JSON.stringify({ attachmentId, fileName: file.name, sizeBytes: file.size }) }),
    ]);
    const [attachment] = await db.select({ id: attachments.id, fileName: attachments.fileName, mimeType: attachments.mimeType, sizeBytes: attachments.sizeBytes, createdAt: attachments.createdAt }).from(attachments).where(eq(attachments.id, attachmentId)).limit(1);
    return Response.json({ attachment }, { status: 201 });
  } catch (error) {
    if (uploadedKey && files) await files.delete(uploadedKey).catch(() => undefined);
    return routeError(error);
  }
}
