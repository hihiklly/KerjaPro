import { LOCAL_USER_COOKIE } from "../../../chatgpt-auth";
import { ApiError, readJson, requiredString, routeError } from "../../_lib/http";

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV !== "development") throw new ApiError(404, "Not found");
    const payload = await readJson(request);
    const email = requiredString(payload, "email", 320).toLowerCase();
    const displayName = requiredString(payload, "displayName", 200);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
    const userId = `local-${Array.from(new Uint8Array(digest)).slice(0, 16).map(value => value.toString(16).padStart(2, "0")).join("")}`;
    const user = { userId, email, displayName, fullName: displayName };
    const response = Response.json({ user });
    response.headers.append("set-cookie", `${LOCAL_USER_COOKIE}=${encodeURIComponent(JSON.stringify(user))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    return response;
  } catch (error) {
    return routeError(error);
  }
}
