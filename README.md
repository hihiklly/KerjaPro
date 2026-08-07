# KerjaPro MVP

Malaysia-first, mobile-first daily work assistant for solo tradesmen. The app covers customer and job workflows, quotations, work reports, invoices, reminders, editable AI drafts, AI Credit pricing, and a sandbox purchase experience.

## Architecture

- Vinext/React/TypeScript single web application, deployed as a Cloudflare Worker
- D1 relational persistence with Drizzle schema and migrations
- R2 private object storage binding for future customer attachments and generated PDFs
- Integer minor units for money and integer milli-units for quantities
- Immutable AI Credit ledger with idempotency keys and separate credit sources
- ChatGPT dispatch authentication boundary for the hosted private application

The main workspace, customer, job, and document screens read from the tenant-scoped API and render explicit empty states when D1 has no records. D1/R2 declarations and the complete relational schema are included; hosted Sites provisions the backing resources.

## Implemented product journeys

- Guided owner/business onboarding with optional company information
- Customers, jobs, assignment history, reminders and customer history surfaces
- Manual-free and AI-assisted quotation review with explicit confirmation and PDF download
- Voice/transcript-ready work completion report with manual-free fallback, editable review and PDF download
- Invoice, customer payment receipt, bank transfer, DuitNow and Touch 'n Go payment instructions
- Team tasks, weekly schedule, job completion totals and owner-approved flat-pay/commission records
- Configuration-driven PAYG bundles and Standard/Pro plan display
- Credit reservation, idempotency, commit/reversal and admin-reason domain rules

Workspace onboarding persists through the API, and the main customer, job, and document lists use the durable tenant-owned model. Provider-backed transcription/AI, service-catalog/settings routes, mutation forms for every workflow, and real billing webhooks remain activation work.

## Persistence API

All routes use the ChatGPT authentication headers and resolve the caller's active business membership on the server. IDs supplied for related records are checked against that same business account.

- `GET|POST /api/workspace` — retrieve or create the authenticated user's workspace
- `GET|POST /api/customers` — list/search or create customers
- `GET|PATCH /api/customers/:id` — retrieve customer history or update a customer
- `GET|POST /api/jobs` — filter/list or create jobs
- `GET|PATCH /api/jobs/:id` — retrieve a job workflow or update its state
- `GET|POST /api/documents` — filter/list or atomically create a document, version, and line/report records
- `GET|POST|PATCH /api/documents/:id` — retrieve the complete document, save a draft version, or confirm/void it

Money fields use integer minor units and quantities use integer milli-units, matching the Drizzle schema. Collection endpoints accept `limit` (maximum 100) and `offset`; customers also accept `q`, while jobs and documents accept their relevant status/kind and relationship filters.

## Local development

Use Node.js 22.13+ and pnpm.

```bash
pnpm install
pnpm run db:generate
pnpm run dev
```

Open the local address printed by the development server. Copy `.env.example` to `.env` only when configuring external providers.

On localhost, unauthenticated visitors are redirected to the built-in development sign-in page. The same email deterministically reopens the same local D1 account. This cookie-based development session is disabled in production; hosted deployments continue to use the authenticated OpenAI user headers.

## Verification

```bash
pnpm run typecheck
pnpm run lint
pnpm run db:generate
pnpm run build
pnpm run test
```

## Provider boundaries

AI and payment UI is intentionally sandboxed in this repository. No real money is taken and no customer document is automatically sent. Production adapters must reserve a credit, call the AI provider, schema-validate the result, and commit or reverse the debit atomically. Paid entitlements must be granted only from verified, idempotent server webhooks.

Voice recording/transcript controls are a provider-ready interface. They do not claim live transcription when `AI_PROVIDER`, `AI_API_KEY`, and `AI_MODEL` are not configured. The payment purchase screen is explicitly marked as a development sandbox.

## Production checklist

1. Select and verify a Malaysia-supported recurring-payment provider; implement and audit its webhook adapter.
2. Configure an AI/transcription provider, structured schemas, retention controls, cost tracking, timeouts, and failure reversal.
3. Complete the remaining client mutation forms, add server-side PDF/R2 handlers, and run tenant-isolation integration tests.
4. Complete legal review of Privacy Policy, Terms, Malaysia PDPA handling, tax wording, and e-Invoice boundaries.
5. Configure monitoring, rate limits, backups, migration rollout, account export/deletion, and incident response.

Never describe the current PDF/document surface as an SST, tax, or LHDN e-Invoice integration. Those integrations are explicitly outside this MVP.
