# @tfx/api-server

Express API server package for TFX Hub contractor and order flows.

## Features

- JWT login via `/auth/login`
- Registration and password reset flows via `/auth/register`, `/auth/password-reset/request`, and `/auth/password-reset/confirm`
- Admin account management and audit endpoints via `/admin/accounts`, `/admin/accounts/:id/rotate-credentials`, `/admin/accounts/:id/password-reset-request`, and `/admin/audit-events`
- Current user session via `/user`
- Orders and contractor endpoints
- Contractor WhatsApp chat flows via `/whatsapp/contractor/messages` and `/whatsapp/contractor/session/:phoneNumber`
- Meta WhatsApp webhook transport via `/webhooks/meta/whatsapp`
- PostgreSQL-backed persistence with schema bootstrap
- Password reset delivery via SMTP when configured, with logger fallback for local development

## WhatsApp Webhook

Set `WHATSAPP_WEBHOOK_TOKEN` to enable Meta webhook verification.

Optional outbound reply settings:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_GRAPH_API_VERSION` defaults to `v18.0`
- `WHATSAPP_GRAPH_API_BASE_URL` for local Graph API emulation or non-default Meta endpoints
- `WHATSAPP_TEST_RECIPIENT` for the smoke script

When outbound credentials are missing, webhook replies are logged locally instead of being sent to Meta.

The sender now renders:

- reply buttons when there are 1 to 3 options
- interactive lists when there are 4 to 10 options
- plain text when there are no options
- In-memory repository for integration testing

## Environment

- `DATABASE_URL` or `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`
- `TFX_ADMIN_USERNAME`, `TFX_ADMIN_EMAIL`, `TFX_ADMIN_PASSWORD` for bootstrap admin startup validation and local admin smoke testing
- `TFX_API_ENABLE_DEMO_SEED=true` only when you explicitly want demo users inserted on startup; production startup now applies schema without demo seed by default
- Optional SMTP delivery: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `PORT` defaults to `3000`

## Start

```bash
pnpm --filter @tfx/api-server start
```

## Smoke Test

For a real Postgres environment where you need the latest schema without seeding demo users:

```bash
pnpm run migrate:api:postgres
```

With `DATABASE_URL` or `DB_HOST`/`DB_USER`/`DB_NAME` configured:

```bash
pnpm run smoke:api:postgres
```

For local SMTP delivery verification without external credentials, start Mailpit and run:

```bash
docker run --rm -p 1025:1025 -p 8025:8025 axllent/mailpit
pnpm run smoke:api:smtp:local
```

For a one-command local flow on Windows that starts Mailpit, runs the smoke test, and cleans up automatically:

```bash
pnpm run smoke:api:smtp:local:auto
```

For a local bootstrap-admin runtime smoke test that validates the required admin env vars, logs in, creates a managed admin, and reads the admin audit feed:

```bash
set TFX_ADMIN_USERNAME=local-admin-secret
set TFX_ADMIN_EMAIL=admin@example.com
set TFX_ADMIN_PASSWORD=change-this-admin-password
pnpm run smoke:api:admin:local
```

Bootstrap admin note:

- The bootstrap admin remains visible in `/admin/accounts` for auditability.
- Bootstrap admin password reset and credential rotation are blocked in the API and must be handled out-of-band.
- Managed admins can still be rotated or issued reset tokens through the authenticated admin endpoints.

For a credential-gated Meta webhook smoke test:

```bash
set WHATSAPP_WEBHOOK_TOKEN=...
set WHATSAPP_ACCESS_TOKEN=...
set WHATSAPP_PHONE_NUMBER_ID=...
set WHATSAPP_TEST_RECIPIENT=27710000001
pnpm run smoke:api:meta:whatsapp
```

The live smoke script accepts `WHATSAPP_TEST_RECIPIENT` in South African local form like `0823453105` or international form like `27823453105` and normalizes it before sending.

For a fully local Meta transport smoke test with no third-party credentials or real WhatsApp recipient:

```bash
pnpm run smoke:api:meta:local
```

For live setup guidance, including using an existing WhatsApp Business app number as the recipient or migrating it into Meta as the sender, see `docs/guides/meta_whatsapp_live_setup.md`.
