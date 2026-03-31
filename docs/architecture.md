# Architecture

## Runtime shape

The scaffold uses Remix for HTTP routing and React-based operational pages, Prisma for persistence, and service modules to keep provider and Shopify responsibilities separate.

## Main modules

- `app/services/merchant-config.server.ts`
  Persists merchant settings and encrypted ClickPesa credentials.
- `app/services/payment-session.server.ts`
  Accepts Shopify offsite payment-session requests, creates internal records, requests a ClickPesa token, generates the hosted checkout link, and returns the app-hosted redirect URL.
- `app/services/clickpesa.server.ts`
  Wraps ClickPesa token generation, hosted checkout creation, payment status queries, checksum verification, and status normalization.
- `app/services/shopify-payments.server.ts`
  Wraps Shopify Payments Apps GraphQL mutations for resolve, reject, pending, refund, capture, and void operations.
- `app/services/reconciliation.server.ts`
  Applies ClickPesa statuses to Shopify and provides job-safe reconciliation for pending sessions.

## Persistence

The Prisma schema stores:

- shops and merchant configs
- encrypted ClickPesa credentials
- payment sessions and attempts
- status events and webhook events
- refund, capture, and void sessions
- audit logs
- idempotency records

## Flow summary

1. Shopify posts to `/app/payment-session`.
2. The app verifies Shopify origin via mTLS proxy headers and parses the offsite payment request.
3. The app creates a payment session row, generates a ClickPesa token, requests a hosted checkout link, stores the link, and returns `redirect_url` back to Shopify.
4. Shopify redirects the buyer to `/clickpesa/redirect/:sessionRef`, and the app forwards the buyer to ClickPesa hosted checkout.
5. ClickPesa returns the buyer to `/clickpesa/return` and posts webhooks to `/webhooks/clickpesa/application`.
6. The app resolves, rejects, or marks the Shopify payment session pending based on ClickPesa outcome or reconciliation status.
7. Support users can inspect recent sessions in `/app`, and background jobs can reconcile unresolved sessions through `/jobs/reconcile-payment-status`.

