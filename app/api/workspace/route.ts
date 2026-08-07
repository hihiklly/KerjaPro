import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { businesses, businessMembers, users } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";
import { ApiError, enumValue, optionalString, readJson, requiredString, routeError } from "../_lib/http";

export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) throw new ApiError(401, "Authentication required");
    const db = getDb();
    const [workspace] = await db
      .select({ business: businesses, membership: businessMembers })
      .from(businessMembers)
      .innerJoin(businesses, eq(businesses.id, businessMembers.accountId))
      .where(eq(businessMembers.userId, user.userId))
      .limit(1);
    return Response.json({ workspace: workspace ?? null });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getChatGPTUser();
    if (!authUser) throw new ApiError(401, "Authentication required");
    const payload = await readJson(request);
    const db = getDb();

    const [existing] = await db
      .select({ accountId: businessMembers.accountId })
      .from(businessMembers)
      .where(eq(businessMembers.userId, authUser.userId))
      .limit(1);
    if (existing) throw new ApiError(409, "This user already has a workspace");

    const now = new Date().toISOString();
    const accountId = crypto.randomUUID();
    const memberId = crypto.randomUUID();
    const ownerName = optionalString(payload, "ownerName", 200) ?? authUser.displayName;
    const userValues = {
      id: authUser.userId,
      email: authUser.email,
      verifiedAt: now,
      updatedAt: now,
    };

    await db.insert(users).values(userValues).onConflictDoUpdate({
      target: users.id,
      set: { email: authUser.email, verifiedAt: now, updatedAt: now },
    });
    const businessValues: typeof businesses.$inferInsert = {
      id: accountId,
      ownerId: authUser.userId,
      businessType: enumValue(payload, "businessType", ["company", "individual"] as const, "individual"),
      name: requiredString(payload, "name", 200),
      ownerName,
      masterRole: enumValue(payload, "masterRole", ["boss", "manager", "owner_worker"] as const, "owner_worker"),
      phone: requiredString(payload, "phone", 50),
      email: optionalString(payload, "email", 320) ?? authUser.email,
      registrationNo: optionalString(payload, "registrationNo", 100),
      address: optionalString(payload, "address", 1_000),
      updatedAt: now,
    };
    const membershipValues: typeof businessMembers.$inferInsert = {
      id: memberId,
      accountId,
      userId: authUser.userId,
      role: "owner",
      updatedAt: now,
    };
    await db.batch([
      db.insert(businesses).values(businessValues),
      db.insert(businessMembers).values(membershipValues),
    ]);
    const [business] = await db.select().from(businesses).where(eq(businesses.id, accountId)).limit(1);
    const [membership] = await db.select().from(businessMembers).where(eq(businessMembers.id, memberId)).limit(1);

    return Response.json({ workspace: { business, membership } }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
