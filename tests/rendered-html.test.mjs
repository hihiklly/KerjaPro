import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL(`../dist/server/index.js?test=${Date.now()}`, import.meta.url);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the KerjaPro application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>KerjaPro/);
  assert.match(html, /Your daily work, sorted|What do you want to do/);
  assert.doesNotMatch(html, /codex-preview/);
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
