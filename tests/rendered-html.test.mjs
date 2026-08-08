import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";

async function render(loggedIn = true) {
  const workerUrl = new URL(`../dist/server/index.js?test=${Date.now()}-${loggedIn}`, import.meta.url);
  const { default: worker } = await import(workerUrl.href);
  const headers = loggedIn ? {
    accept: "text/html", "oai-authenticated-user-id": "test-user", "oai-authenticated-user-email": "owner@example.com",
    "oai-authenticated-user-full-name": "Test%20Owner", "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
  } : { accept: "text/html" };
  return worker.fetch(new Request("http://localhost/", { headers, redirect: "manual" }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the authenticated KerjaPro application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>KerjaPro/);
  assert.doesNotMatch(html, /codex-preview/);
});

test("logged-out visitors enter the sign-in flow", async () => {
  const response = await render(false);
  assert.ok(response.status >= 300 && response.status < 400);
  const location = new URL(response.headers.get("location") ?? "", "http://localhost");
  assert.equal(location.pathname, "/signin-with-chatgpt");
  assert.equal(location.searchParams.get("return_to"), "/");
});

test("email sign-in is real while social providers remain disabled", async () => {
  const [page, form, route] = await Promise.all([
    fs.readFile(new URL("../app/signin-with-chatgpt/page.tsx", import.meta.url), "utf8"),
    fs.readFile(new URL("../app/signin-with-chatgpt/local-sign-in-form.tsx", import.meta.url), "utf8"),
    fs.readFile(new URL("../app/api/auth/local/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(form, /fetch\("\/api\/auth\/local"/);
  assert.match(page, /Continue with Google/);
  assert.equal(page.match(/disabled>/g)?.length, 2);
  assert.match(route, /HttpOnly; SameSite=Lax/);
});

test("home stays focused on daily jobs and collection", async () => {
  const app = await fs.readFile(new URL("../app/trade-app.tsx", import.meta.url), "utf8");
  for (const label of ["Today’s Jobs", "Pending Jobs", "Amount to Collect", "＋ New Job"]) assert.match(app, new RegExp(label));
  assert.match(app, /type Tab = "home" \| "jobs" \| "customers" \| "more"/);
  assert.match(app, /Home.*Jobs.*Customers.*More/s);
  assert.doesNotMatch(app, /type Tab = .*documents/);
});

test("new jobs use the saved menu and a sticky calculated total", async () => {
  const app = await fs.readFile(new URL("../app/trade-app.tsx", import.meta.url), "utf8");
  for (const copy of ["Select customer", "Pick what they need", "Search services or products", "Custom item", "Create Quote ·"]) assert.match(app, new RegExp(copy));
  assert.match(app, /fetch\("\/api\/catalog"/);
  assert.match(app, /quantityMilli \* item\.unitPriceMinor/);
  assert.match(app, /className="order-panel"/);
});

test("one job owns its quotation, line items and financial totals", async () => {
  const [route, schema] = await Promise.all([
    fs.readFile(new URL("../app/api/jobs/route.ts", import.meta.url), "utf8"),
    fs.readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  ]);
  assert.match(route, /db\.insert\(jobs\)/);
  assert.match(route, /db\.insert\(jobLineItems\)/);
  assert.match(route, /db\.insert\(documents\).*kind: "quotation"/s);
  assert.match(schema, /jobLineItems/);
  for (const field of ["subtotalMinor", "discountMinor", "taxMinor", "totalMinor", "balanceMinor"]) assert.match(schema, new RegExp(field));
});

test("lifecycle exposes one status-driven primary action", async () => {
  const [app, route] = await Promise.all([
    fs.readFile(new URL("../app/trade-app.tsx", import.meta.url), "utf8"),
    fs.readFile(new URL("../app/api/jobs/[id]/route.ts", import.meta.url), "utf8"),
  ]);
  for (const label of ["Send Quote", "Mark Quote Accepted", "Schedule Job", "Start Job", "Complete Job", "Collect Payment", "Record Payment"]) assert.match(app, new RegExp(label));
  for (const action of ["send_quote", "accept_quote", "schedule", "start", "complete", "cancel"]) assert.match(route, new RegExp(action));
  assert.match(app, /meta\.actionLabel.*sticky-job-action/s);
});

test("scheduling uses real workspace members and persists assignment history", async () => {
  const [app, route, team] = await Promise.all([
    fs.readFile(new URL("../app/trade-app.tsx", import.meta.url), "utf8"),
    fs.readFile(new URL("../app/api/jobs/[id]/route.ts", import.meta.url), "utf8"),
    fs.readFile(new URL("../app/api/team/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(app, /fetch\("\/api\/team"/);
  assert.match(app, /name="assignedMemberId"/);
  assert.match(route, /db\.insert\(jobAssignments\)/);
  assert.match(route, /businessMembers\.accountId/);
  assert.match(team, /eq\(businessMembers\.status, "active"\)/);
});

test("completion automatically generates the report and final invoice", async () => {
  const route = await fs.readFile(new URL("../app/api/jobs/[id]/route.ts", import.meta.url), "utf8");
  assert.match(route, /action === "complete"/);
  assert.match(route, /kind: "work_report"/);
  assert.match(route, /completionReports/);
  assert.match(route, /kind: "invoice"/);
  assert.match(route, /invoiceItems/);
});

test("payments support partial collection and close only at zero balance", async () => {
  const route = await fs.readFile(new URL("../app/api/jobs/[id]/payment/route.ts", import.meta.url), "utf8");
  for (const method of ["cash", "bank_transfer", "duitnow", "card", "other"]) assert.match(route, new RegExp(method));
  assert.match(route, /balanceMinor === 0 \? "paid"/);
  assert.match(route, /db\.insert\(customerPayments\)/);
  assert.match(route, /nextNumber\("RCP"\)/);
  assert.match(route, /jobCompensations/);
});

test("businesses configure a general-purpose catalogue", async () => {
  const [app, api, schema] = await Promise.all([
    fs.readFile(new URL("../app/trade-app.tsx", import.meta.url), "utf8"),
    fs.readFile(new URL("../app/api/catalog/route.ts", import.meta.url), "utf8"),
    fs.readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  ]);
  for (const label of ["Services & product menu", "Duration (min)", "Tax (%)", "Optional cost & commission"]) assert.ok(app.includes(label));
  assert.match(api, /itemType.*service.*product/s);
  for (const field of ["estimatedDurationMinutes", "taxRateBasisPoints", "costMinor", "commissionBasisPoints"]) assert.match(schema, new RegExp(field));
  assert.doesNotMatch(app, /aircon|air-conditioning/i);
});

test("migration preserves old jobs while adding durable workflow tables", async () => {
  const migration = await fs.readFile(new URL("../drizzle/0006_square_baron_strucker.sql", import.meta.url), "utf8");
  assert.match(migration, /CREATE TABLE `job_line_items`/);
  assert.match(migration, /CREATE TABLE `job_events`/);
  assert.match(migration, /WHEN 'new' THEN 'draft'/);
  assert.match(migration, /WHEN 'quoted' THEN 'quote_sent'/);
});
