# Production readiness

## Current scaffold covers

- Merchant credential storage with encryption at rest
- Offsite payment-session creation and redirect URL generation
- ClickPesa webhook ingestion and duplicate suppression
- Shopify payment resolve, reject, and pending mutations
- Audit logging and reconciliation job hooks

## Still required before launch

- Real Shopify app installation and token lifecycle for approved Payments Platform access
- Reverse proxy or ingress configuration that enforces Shopify mTLS and forwards a trusted verification header to the app
- Confirmed ClickPesa webhook signing/checksum rules in the live environment
- Confirmed refund, capture, void, and test transaction support from ClickPesa
- Queue-backed async processing for webhooks and reconciliation
- Production observability stack for logs, alerts, and traces
- End-to-end sandbox and production test plans with Shopify review artifacts

## Operational assumptions

- Shopify Payments Apps API version is pinned to `2026-01` in this scaffold.
- `JOB_SHARED_SECRET` protects the reconciliation endpoint.
- `CLICKPESA_SUPPORTS_REFUNDS`, `CLICKPESA_SUPPORTS_CAPTURES`, and `CLICKPESA_SUPPORTS_VOIDS` are feature flags only. They do not replace actual provider-side implementation.

## Recommended next work

1. Install dependencies and generate Prisma client.
2. Replace placeholder app and extension URLs.
3. Wire Shopify install/auth and real per-shop access token storage.
4. Validate the exact ClickPesa request and webhook fields against sandbox traffic.
5. Add queue workers, tests, and deployment-specific mTLS proxy configuration.
