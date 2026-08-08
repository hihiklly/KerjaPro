import { and, asc, eq } from "drizzle-orm";
import { serviceCatalog } from "../../../../db/schema";
import { ApiError, getAccountContext, readJson, requiredString, routeError } from "../../_lib/http";

type Analysis = {
  transcript: string;
  customer: { name: string | null; phone: string | null; serviceAddress: string | null };
  request: string;
  summary: string;
  suggestions: Array<{ catalogItemId: string; quantityMilli: number }>;
};

export async function POST(request: Request) {
  try {
    const { db, accountId } = await getAccountContext();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new ApiError(503, "AI analysis is not configured. Add OPENAI_API_KEY to use message or voice analysis.");

    const contentType = request.headers.get("content-type") ?? "";
    let transcript: string;
    if (contentType.includes("multipart/form-data")) {
      const data = await request.formData();
      const audio = data.get("audio");
      if (!(audio instanceof File) || audio.size === 0) throw new ApiError(400, "Record a voice message first");
      if (audio.size > 15 * 1024 * 1024) throw new ApiError(413, "Voice recording must be smaller than 15 MB");
      transcript = await transcribeAudio(audio, apiKey);
    } else {
      transcript = requiredString(await readJson(request), "message", 10_000);
    }

    const catalog = await db.select({ id: serviceCatalog.id, name: serviceCatalog.name, description: serviceCatalog.description, category: serviceCatalog.category, unit: serviceCatalog.unit })
      .from(serviceCatalog).where(and(eq(serviceCatalog.accountId, accountId), eq(serviceCatalog.active, true)))
      .orderBy(asc(serviceCatalog.category), asc(serviceCatalog.sortOrder), asc(serviceCatalog.name));
    return Response.json({ analysis: await analyzeMessage(transcript, catalog, apiKey) });
  } catch (error) {
    return routeError(error);
  }
}

async function transcribeAudio(audio: File, apiKey: string) {
  const data = new FormData();
  data.set("model", process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-mini-transcribe");
  data.set("file", audio, audio.name || "customer-message.webm");
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { authorization: `Bearer ${apiKey}` }, body: data });
  const payload = await response.json() as { text?: string; error?: { message?: string } };
  if (!response.ok || !payload.text?.trim()) throw new ApiError(502, payload.error?.message ?? "Voice transcription failed");
  return payload.text.trim();
}

async function analyzeMessage(transcript: string, catalog: Array<{ id: string; name: string; description: string | null; category: string; unit: string }>, apiKey: string): Promise<Analysis> {
  const schema = {
    type: "object", additionalProperties: false,
    properties: {
      customer: { type: "object", additionalProperties: false, properties: { name: { type: ["string", "null"] }, phone: { type: ["string", "null"] }, serviceAddress: { type: ["string", "null"] } }, required: ["name", "phone", "serviceAddress"] },
      request: { type: "string" }, summary: { type: "string" },
      suggestions: { type: "array", items: { type: "object", additionalProperties: false, properties: { catalogItemId: { type: "string" }, quantityMilli: { type: "integer", minimum: 1 } }, required: ["catalogItemId", "quantityMilli"] } },
    }, required: ["customer", "request", "summary", "suggestions"],
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-5.6-sol",
      input: [
        { role: "developer", content: [{ type: "input_text", text: "Extract only facts present in the customer message. Never diagnose or invent missing details. Match requested work only to the supplied business catalog IDs. Use quantityMilli where 1000 means quantity 1. Return no suggestion when a catalog match is uncertain. Keep request and summary concise." }] },
        { role: "user", content: [{ type: "input_text", text: `CUSTOMER MESSAGE:\n${transcript}\n\nBUSINESS CATALOG:\n${JSON.stringify(catalog)}` }] },
      ],
      text: { verbosity: "low", format: { type: "json_schema", name: "job_message_analysis", strict: true, schema } },
    }),
  });
  const payload = await response.json() as { output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>; error?: { message?: string } };
  if (!response.ok) throw new ApiError(502, payload.error?.message ?? "Message analysis failed");
  const outputText = payload.output?.flatMap(item => item.content ?? []).find(item => item.type === "output_text")?.text;
  if (!outputText) throw new ApiError(502, "Message analysis returned no result");
  try {
    const parsed = JSON.parse(outputText) as Omit<Analysis, "transcript">;
    const allowedIds = new Set(catalog.map(item => item.id));
    return { transcript, ...parsed, suggestions: parsed.suggestions.filter(item => allowedIds.has(item.catalogItemId)) };
  } catch {
    throw new ApiError(502, "Message analysis returned an invalid result");
  }
}
