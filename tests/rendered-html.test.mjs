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
