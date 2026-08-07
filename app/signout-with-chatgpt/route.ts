import { LOCAL_USER_COOKIE } from "../chatgpt-auth";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  const requestUrl = new URL(request.url);
  const returnTo = requestUrl.searchParams.get("return_to");
  const safeReturnTo = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  const signInUrl = new URL("/signin-with-chatgpt", request.url);
  signInUrl.searchParams.set("return_to", safeReturnTo);
  return new Response(null, {
    status: 303,
    headers: {
      location: signInUrl.toString(),
      "set-cookie": `${LOCAL_USER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    },
  });
}
