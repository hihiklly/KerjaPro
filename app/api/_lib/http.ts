import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { businesses, businessMembers } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function getAccountContext() {
  const user = await getChatGPTUser();
  if (!user) throw new ApiError(401, "Authentication required");

  const db = getDb();
  const [membership] = await db
    .select({
      accountId: businessMembers.accountId,
      memberId: businessMembers.id,
      role: businessMembers.role,
    })
    .from(businessMembers)
    .innerJoin(businesses, eq(businesses.id, businessMembers.accountId))
    .where(
      and(
        eq(businessMembers.userId, user.userId),
        eq(businessMembers.status, "active"),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new ApiError(404, "No workspace exists for this user");
  }

  return { db, user, ...membership };
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new ApiError(400, "Request body must be a JSON object");
    }
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "Request body must contain valid JSON");
  }
}

export function requiredString(
  payload: Record<string, unknown>,
  key: string,
  maxLength = 500,
) {
  const value = payload[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, `${key} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new ApiError(400, `${key} must be at most ${maxLength} characters`);
  }
  return trimmed;
}

export function optionalString(
  payload: Record<string, unknown>,
  key: string,
  maxLength = 2_000,
) {
  const value = payload[key];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new ApiError(400, `${key} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new ApiError(400, `${key} must be at most ${maxLength} characters`);
  }
  return trimmed || null;
}

export function optionalInteger(
  payload: Record<string, unknown>,
  key: string,
  options: { min?: number; max?: number } = {},
) {
  const value = payload[key];
  if (value === undefined || value === null) return null;
  if (!Number.isSafeInteger(value)) throw new ApiError(400, `${key} must be an integer`);
  const number = value as number;
  if (options.min !== undefined && number < options.min) {
    throw new ApiError(400, `${key} must be at least ${options.min}`);
  }
  if (options.max !== undefined && number > options.max) {
    throw new ApiError(400, `${key} must be at most ${options.max}`);
  }
  return number;
}

export function enumValue<const T extends readonly string[]>(
  payload: Record<string, unknown>,
  key: string,
  values: T,
  fallback?: T[number],
): T[number] {
  const value = payload[key] ?? fallback;
  if (typeof value !== "string" || !values.includes(value)) {
    throw new ApiError(400, `${key} must be one of: ${values.join(", ")}`);
  }
  return value as T[number];
}

export function listOptions(request: Request) {
  const params = new URL(request.url).searchParams;
  const requestedLimit = Number(params.get("limit") ?? 50);
  const requestedOffset = Number(params.get("offset") ?? 0);
  const limit = Number.isSafeInteger(requestedLimit)
    ? Math.min(100, Math.max(1, requestedLimit))
    : 50;
  const offset = Number.isSafeInteger(requestedOffset)
    ? Math.max(0, requestedOffset)
    : 0;
  return { limit, offset };
}

export function routeError(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Unexpected error";
  const detail = error instanceof Error && error.cause instanceof Error
    ? error.cause.message
    : "";
  const combined = `${message}\n${detail}`;

  if (combined.includes("UNIQUE constraint failed")) {
    return Response.json({ error: "A record with that unique value already exists" }, { status: 409 });
  }
  if (combined.includes("FOREIGN KEY constraint failed")) {
    return Response.json({ error: "A related record does not exist" }, { status: 400 });
  }
  if (combined.includes("no such table")) {
    return Response.json({ error: "Database migrations have not been applied" }, { status: 503 });
  }

  console.error(error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
