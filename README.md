# KerjaPro MVP

Malaysia-first, mobile-first job management for service and trade businesses. The app keeps customer intake, quotations, scheduling, work, invoices and payment collection inside one job.

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
- New Job intake with existing-customer history, inline new-customer creation, message analysis and voice transcription
- Voice/transcript-ready work completion report with manual-free fallback, editable review and PDF download
- Invoice, customer payment receipt, bank transfer, DuitNow and Touch 'n Go payment instructions
- Team tasks, weekly schedule, job completion totals and owner-approved flat-pay/commission records
- Configuration-driven PAYG bundles and Standard/Pro plan display
- Credit reservation, idempotency, commit/reversal and admin-reason domain rules

Workspace onboarding and the complete New Job flow persist through tenant-scoped APIs. New customer records are inserted atomically with their first job, while exact phone matches reuse the saved customer and history.

## Persistence API

All routes use the ChatGPT authentication headers and resolve the caller's active business membership on the server. IDs supplied for related records are checked against that same business account.

- `GET|POST /api/workspace` — retrieve or create the authenticated user's workspace
- `GET|POST /api/customers` — list/search or create customers
- `GET|PATCH /api/customers/:id` — retrieve customer history or update a customer
- `GET|POST /api/catalog` — list or configure the business service/product menu
- `POST /api/jobs/analyze` — transcribe or analyze a customer message against that menu
- `POST /api/jobs/:id/payment` — record deposits, partial or full payment
- `GET /api/team` — list active workspace members for scheduling
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

On localhost, unauthenticated visitors are redirected to the built-in development sign-in page. The same email deterministically reopens the same local D1 account. This cookie-based development session is disabled in production; hosted deployments continue to use the authenticated OpenAI user headers. Google and Apple controls are visible placeholders only and do not start an external sign-in flow.

## Daily job workflow

KerjaPro keeps quotations, scheduling, work completion, invoices, receipts, payments, revenue and commission attached to one job. Owners first create their own reusable service and product menu in **More**, including prices, units, duration, tax, cost and commission. Daily work then follows:

`Write or choose customer → Tap services/products → Quote → Schedule → Do work → Complete → Collect payment`

Deposits, partial payments, added work, discounts, rescheduling, cancellation, notes and warranty remain available under the job’s expandable options. Apply all D1 migrations before using the redesigned workflow.

## Verification

```bash
pnpm run typecheck
pnpm run lint
pnpm run db:generate
pnpm run build
pnpm run test
```

## Provider boundaries

Customer-message analysis uses the OpenAI Responses API with strict structured output, and voice messages use the transcription API. Configure `OPENAI_API_KEY` to enable both. The server limits recording size, sends the audio transiently for transcription, validates catalog IDs returned by analysis, and never invents a demo result when the provider is unavailable.

## Production checklist

1. Select and verify a Malaysia-supported recurring-payment provider; implement and audit its webhook adapter.
2. Add provider cost tracking, request timeouts and operational rate limits for AI analysis at production scale.
3. Complete the remaining client mutation forms, add server-side PDF/R2 handlers, and run tenant-isolation integration tests.
4. Complete legal review of Privacy Policy, Terms, Malaysia PDPA handling, tax wording, and e-Invoice boundaries.
5. Configure monitoring, rate limits, backups, migration rollout, account export/deletion, and incident response.

Never describe the current PDF/document surface as an SST, tax, or LHDN e-Invoice integration. Those integrations are explicitly outside this MVP.
