# ClickPesa Shopify Payments App

This repository is a scaffold for a Shopify offsite payments app that redirects buyers from Shopify checkout to ClickPesa hosted checkout, receives ClickPesa status updates, and updates Shopify payment sessions.

## Included

- Remix and TypeScript app shell
- Prisma schema for merchants, payment sessions, webhook events, operations, and audit logs
- Merchant onboarding form for saving ClickPesa credentials
- Offsite payment-session endpoint that returns `redirect_url`
- ClickPesa redirect, return, cancel, and webhook routes
- Shopify payment session resolve, reject, and pending mutation wrappers
- Reconciliation job endpoint for pending sessions
- Placeholder refund, capture, and void routes that explicitly reject until ClickPesa support is confirmed and implemented

## Quick start

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` and a base64-encoded 32-byte `CREDENTIAL_ENCRYPTION_KEY`.
3. Install dependencies with `npm install`.
4. Generate the Prisma client with `npx prisma generate`.
5. Run migrations with `npx prisma migrate dev`.
6. Replace the placeholder URLs in `shopify.app.toml` and `extensions/clickpesa-offsite/shopify.extension.toml`.
7. Start the app with `npm run dev`.

## Important notes

- The scaffold assumes Shopify-originated payment operation traffic is terminated behind mTLS-aware infrastructure and forwarded with a verified header.
- Merchant ClickPesa credentials are encrypted at rest with AES-256-GCM.
- Refund, capture, and void flows are intentionally marked blocked until ClickPesa support is confirmed and the provider-side API work is added.
- For real multi-merchant production use, replace the temporary global `SHOPIFY_PAYMENTS_APP_ACCESS_TOKEN` fallback with the actual Shopify installation and token lifecycle.

## Key routes

- `/app/onboarding`
- `/app/settings/clickpesa`
- `/app/payment-session`
- `/app/refund-session`
- `/app/capture-session`
- `/app/void-session`
- `/clickpesa/redirect/:sessionRef`
- `/clickpesa/return`
- `/clickpesa/cancel`
- `/webhooks/clickpesa/application`
- `/jobs/reconcile-payment-status`

## Docs

- `docs/architecture.md`
- `docs/production-readiness.md`

