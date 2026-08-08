import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL(`../dist/server/index.js?test=${Date.now()}`, import.meta.url);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: {
    accept: "text/html",
    "oai-authenticated-user-id": "test-user",
    "oai-authenticated-user-email": "owner@example.com",
    "oai-authenticated-user-full-name": "Test%20Owner",
    "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
  } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

async function renderLoggedOut() {
  const workerUrl = new URL(`../dist/server/index.js?logged-out-test=${Date.now()}`, import.meta.url);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" }, redirect: "manual" }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the KerjaPro application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>KerjaPro/);
  assert.match(html, /Your daily work, sorted|What do you want to do/);
  assert.doesNotMatch(html, /codex-preview/);
});

test("logged-out visitors enter the real sign-in flow before the workspace", async () => {
  const response = await renderLoggedOut();
  assert.ok(response.status >= 300 && response.status < 400);
  const location = new URL(response.headers.get("location") ?? "", "http://localhost");
  assert.equal(location.pathname, "/signin-with-chatgpt");
  assert.equal(location.searchParams.get("return_to"), "/");
});

test("email sign-in remains primary while social providers are placeholders", async () => {
  const fs = await import("node:fs/promises");
  const [page, form, route] = await Promise.all([
    fs.readFile(new URL("../app/signin-with-chatgpt/page.tsx", import.meta.url), "utf8"),
    fs.readFile(new URL("../app/signin-with-chatgpt/local-sign-in-form.tsx", import.meta.url), "utf8"),
    fs.readFile(new URL("../app/api/auth/local/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(form, /Continue with email/);
  assert.match(form, /fetch\("\/api\/auth\/local"/);
  assert.match(page, /Continue with Google/);
  assert.match(page, /Continue with Apple/);
  assert.equal(page.match(/disabled>/g)?.length, 2);
  assert.doesNotMatch(page, /href=.*api\/auth\/(?:google|apple)/);
  assert.match(route, /SHA-256/);
  assert.match(route, /HttpOnly; SameSite=Lax/);
});

test("desktop and settings surfaces expose the sign-out flow", async () => {
  const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../app/trade-app.tsx", import.meta.url), "utf8"));
  assert.equal(source.match(/href="\/signout-with-chatgpt\?return_to=%2F"/g)?.length, 2);
  assert.match(source, /sidebar-signout/);
  assert.match(source, /settings-signout/);
});

test("team and service catalogue use the main workspace pane", async () => {
  const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../app/trade-app.tsx", import.meta.url), "utf8"));
  assert.match(source, /tab === "team".*workspace-page.*TeamSheet/s);
  assert.match(source, /tab === "catalog".*workspace-page.*ServiceCatalog/s);
  assert.doesNotMatch(source, /sheet === "(?:team|catalog)"/);
});

test("main workspace collections are loaded from local API routes", async () => {
  const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../app/trade-app.tsx", import.meta.url), "utf8"));
  for (const route of ["/api/workspace", "/api/customers?limit=100", "/api/jobs?limit=100", "/api/documents?limit=100"]) {
    assert.match(source, new RegExp(`fetch\\(\"${route.replace(/[?]/g, "\\?")}`));
  }
  assert.doesNotMatch(source, /const customers = \[/);
  assert.doesNotMatch(source, /const jobs = \[/);
  assert.doesNotMatch(source, /const documents = \[/);
});

test("financial and confirmation rules are source-enforced", async () => {
  const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../app/domain.ts", import.meta.url), "utf8"));
  assert.match(source, /Math\.round/);
  assert.match(source, /INSUFFICIENT_CREDITS/);
  assert.match(source, /humanVerified/);
  assert.match(source, /subscription.*purchased/s);
});

test("quotation download and payment collection terms are implemented", async () => {
  const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../app/trade-app.tsx", import.meta.url), "utf8"));
  assert.match(source, /application\/pdf/);
  assert.match(source, /Quotation-Q-2026-0042\.pdf/);
  assert.match(source, /Immediately/);
  assert.match(source, /Within 3 days/);
  assert.match(source, /Within 30 days/);
  assert.match(source, /Finish job & set payment reminder/);
});

test("invoice sharing and tenant-scoped staff controls are present", async () => {
  const fs = await import("node:fs/promises");
  const [app, schema] = await Promise.all([fs.readFile(new URL("../app/trade-app.tsx", import.meta.url), "utf8"), fs.readFile(new URL("../db/schema.ts", import.meta.url), "utf8")]);
  assert.match(app, /Share by WhatsApp/);
  assert.match(app, /navigator\.share/);
  assert.match(app, /OWNER \/ MASTER ACCOUNT/);
  assert.match(app, /Worker — own assigned jobs/);
  assert.match(schema, /businessMembers/);
  assert.match(schema, /staffInvites/);
  assert.match(schema, /assignedMemberId/);
});

test("home SOP, payment receipts, and accounting readiness are present", async () => {
  const fs = await import("node:fs/promises");
  const [app, schema] = await Promise.all([fs.readFile(new URL("../app/trade-app.tsx", import.meta.url), "utf8"), fs.readFile(new URL("../db/schema.ts", import.meta.url), "utf8")]);
  for (const step of ["Customer", "Quotation", "Do & finish work", "Invoice", "Payment receipt"]) assert.match(app, new RegExp(step.replace("&", "&")));
  assert.match(app, /not MyInvois submissions/);
  assert.match(app, /SST registration no/);
  assert.match(app, /seven years/i);
  assert.match(schema, /customerPayments/);
  assert.match(schema, /taxIdentificationNo/);
  assert.match(schema, /expenses/);
});

test("business registration and reusable service pricing are implemented", async () => {
  const fs = await import("node:fs/promises");
  const [app, schema] = await Promise.all([fs.readFile(new URL("../app/trade-app.tsx", import.meta.url), "utf8"), fs.readFile(new URL("../db/schema.ts", import.meta.url), "utf8")]);
  assert.match(app, /Company \/ team business/);
  assert.match(app, /Individual business/);
  assert.match(app, /Master account permissions/);
  assert.match(app, /reusable service catalogue/);
  assert.match(app, /Tap saved services/);
  assert.match(schema, /documentTemplates/);
  assert.match(schema, /serviceCatalog/);
  assert.match(schema, /standardPriceMinor/);
  assert.match(schema, /businessType/);
});

test("managers can assign jobs with tenant-owned history", async () => {
  const fs = await import("node:fs/promises");
  const [app, schema] = await Promise.all([fs.readFile(new URL("../app/trade-app.tsx", import.meta.url), "utf8"), fs.readFile(new URL("../db/schema.ts", import.meta.url), "utf8")]);
  assert.match(app, /MANAGER ACCESS/);
  assert.match(app, /Assign to \{selectedMember\}/);
  assert.match(app, /Assignment history/);
  assert.match(app, /Manager — assign and monitor all jobs/);
  assert.match(schema, /jobAssignments/);
  assert.match(schema, /assignedByMemberId/);
  assert.match(schema, /\["owner", "manager", "worker"\]/);
});

test("customer payment methods and team job compensation are implemented", async () => {
  const fs = await import("node:fs/promises");
  const [app, schema] = await Promise.all([fs.readFile(new URL("../app/trade-app.tsx", import.meta.url), "utf8"), fs.readFile(new URL("../db/schema.ts", import.meta.url), "utf8")]);
  for (const label of ["Bank transfer", "DuitNow", "Touch ’n Go eWallet QR", "Commission & pay", "Ready to approve", "Schedule"]) assert.match(app, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(app, /PAYMENT OPTIONS/);
  assert.match(app, /Worker pay/);
  assert.match(schema, /paymentMethods/);
  assert.match(schema, /staffPayRules/);
  assert.match(schema, /jobCompensations/);
  assert.match(schema, /pending_completion/);
});

test("completion reports support free manual and reviewed AI drafts", async () => {
  const app = await import("node:fs/promises").then(fs => fs.readFile(new URL("../app/trade-app.tsx", import.meta.url), "utf8"));
  assert.match(app, /CompletionReportSheet/);
  assert.match(app, /Manual completion report/);
  assert.match(app, /AI DRAFT — PLEASE VERIFY/);
  assert.match(app, /I confirm this report matches the work actually completed/);
  assert.match(app, /Work-Report-WR-2026-0020\.pdf/);
  assert.match(app, /Live transcription is enabled only after a provider is configured/);
});

test("pricing and credit integrity are configuration-driven", async () => {
  const fs = await import("node:fs/promises");
  const [config, domain] = await Promise.all([fs.readFile(new URL("../app/product-config.ts", import.meta.url), "utf8"), fs.readFile(new URL("../app/domain.ts", import.meta.url), "utf8")]);
  for (const value of ["1200", "3000", "6800", "2900", "5900", "29000", "59000"]) assert.match(config, new RegExp(value));
  assert.match(domain, /reserveGenerationCredit/);
  assert.match(domain, /idempotencyKey/);
  assert.match(domain, /reverseGenerationCredit/);
  assert.match(domain, /ADMIN_REASON_REQUIRED/);
});
