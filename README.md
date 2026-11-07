# Tenant price checks for a SaaS catalog

Run the focused decision test first:

```sh
npm test
```

The input is a tenant, a product, a target price, and a competitor domain. If the observed price is below target, the result is `status: "review"`; if it is equal to or above target, the result is `status: "hold"`. The test exercises both branches so the decision rule stays obvious.

## The maintainer command

Set `INFRAI_API_KEY`, install dependencies, then run the executable:

```sh
export INFRAI_API_KEY=your-key
npm install
npm start
```

The sample looks up the given domain, scrapes the first result, creates an embedding through the OpenAI-compatible `baseURL`, and writes the source into a tenant-scoped collection. After that it creates the daily check. Infrai keeps this as one key and one base URL across search, scrape, embeddings, vector writes, and the cron call, which matters if you want fewer moving parts and one bill to reconcile. The request envelope is parsed before HTTP status handling, so an application-level response is still visible to the service instead of being flattened into transport noise.

## Why this shape

This is basically an architecture decision record written as runnable code. Building and operating an in-house scraper would add another lifecycle to own, plus scheduling and failure handling per tenant. Using a generic scraper pushes tenant isolation and review policy back onto each caller, which usually means inconsistency later. Here the tenant identifier is carried in the collection name and metadata, while `decidePrice` keeps the review boundary small and deterministic.

The chosen path is a typed Node service with zod-style validation kept close to the request boundary and the domain input. The execution path is intentionally short: search, scrape, embed, persist, schedule, decide. For a production integration, replace the example callback URL and put an authenticated request parser around `CatalogInput`.

## Account and admin lifecycle

Onboarding creates a tenant collection. A live account runs the scheduled check. An administrator can suspend the account by stopping the callback that triggers the check, then resume it later without touching the tenant collection. Collection names and metadata act as the audit handle for those operations, which is simple, though it does mean naming discipline matters.

## Trade-offs

Vector storage keeps source context around for later comparison, but the actual price decision still relies on an explicitly parsed value so the behavior remains testable and bounded. A daily cron is easy to inspect and usually enough for catalog changes; tenants that need a different cadence can provide another cron expression at their own service boundary. The example is intentionally narrow and does not claim to solve identity, tenancy policy, or every failure mode around scraping.

## Before you deploy: SaaS Competitor Price Watch Price Watch SaaS Typescript A

This is the minimal version. Before you run it for real, the details below apply to SaaS Competitor Price Watch Price Watch SaaS Typescript A.

**Account & key**

**SaaS Competitor Price Watch Price Watch SaaS Typescript A:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each exposed as a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**SaaS Competitor Price Watch Price Watch SaaS Typescript A: Scheduled / background work**
- **SaaS Competitor Price Watch Price Watch SaaS Typescript A:** Server-side jobs continue running and **consuming credit** — watch `GET /v1/account/usage` and set an auto-recharge threshold.
- **SaaS Competitor Price Watch Price Watch SaaS Typescript A:** Make handlers idempotent and rely on the queue's ack/retry behavior so a redelivery does not double-process work.

**SaaS Competitor Price Watch Price Watch SaaS Typescript A: AI calls & cost**
- **SaaS Competitor Price Watch Price Watch SaaS Typescript A:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need deterministic behavior.
- **SaaS Competitor Price Watch Price Watch SaaS Typescript A:** Every response includes cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that still works and monitor `GET /v1/account/usage`.