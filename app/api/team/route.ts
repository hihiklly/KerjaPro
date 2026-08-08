import { and, asc, eq } from "drizzle-orm";
import { businessMembers, users } from "../../../db/schema";
import { getAccountContext, routeError } from "../_lib/http";

export async function GET() {
  try {
    const { db, accountId } = await getAccountContext();
    const rows = await db.select({ member: businessMembers, user: { email: users.email } }).from(businessMembers)
      .innerJoin(users, eq(users.id, businessMembers.userId))
      .where(and(eq(businessMembers.accountId, accountId), eq(businessMembers.status, "active")))
      .orderBy(asc(businessMembers.role), asc(users.email));
    return Response.json({ members: rows.map(({ member, user }) => ({ id: member.id, role: member.role, name: user.email.split("@")[0].replace(/[._-]+/g, " "), email: user.email })) });
  } catch (error) {
    return routeError(error);
  }
}
