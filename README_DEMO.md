# Quick Start (Local Development)

## 1. Install dependencies & migrate DB

```sh
npm ci
npx prisma migrate dev --name init
```

## 2. Run the app (local dev)

```sh
DATABASE_URL=... S3_BUCKET=... AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... node src/server.cjs
```

- Set your environment variables as needed for your local Postgres and S3/MinIO.

## 3. Run tests

```sh
npm test
```

- Runs all Jest tests in the tests/ directory.

# Deliverables

## Acceptance Criteria & Verification Checklist

### WhatsApp Onboarding Flow

- **Test:** Send initial message from demo phone number → server responds with welcome template.
- **Verify:** DB contains user with phone and onboarding_state updated to `awaiting_role` or `complete`.

### Demo Sandbox Seeds

- **Test:** Start container with `DEMO_MODE=true`; call `/demo/health` or query DB.
- **Verify:** `demo-customer-1`, `demo-contractor-1`, and `demo-job-1..3` exist with expected statuses.

### Docker Demo Image

- **Test:** `docker build` completes; `docker run` starts and exposes app on port.
- **Verify:** App responds to health endpoint and WhatsApp webhook endpoint reachable locally (use ngrok or local tunnel for provider testing).

### Automated Acceptance Test Examples

```sh
curl -s http://localhost:3000/demo/health # → JSON { "seeded": true }
psql -c "select count(*) from users where demo = true;" # → 2
```

# acme-demo: Demo Docker Image

## Purpose

A prebuilt Docker image for demonstrating the ACME onboarding and job workflow, including WhatsApp integration and seeded demo data. Designed for local testing, onboarding flow validation, and API endpoint verification.

## Prerequisites

- Docker installed (Desktop or CLI)
- (Optional) Local environment variables for WhatsApp or DB integration

## Quick Start

Build the image:

```
docker build -t acme-demo:latest .
```

Run the container:

```
docker run --rm -p 3000:3000 -e DEMO_MODE=true acme-demo:latest
```

## Demo Mode Behavior

- Setting `DEMO_MODE=true` enables deterministic demo data and disables destructive operations.
- Onboarding and job flows are seeded and repeatable.
- No real WhatsApp messages are sent unless configured with valid credentials.

## WhatsApp Onboarding Test Steps

1. Send a message from a sample phone number (e.g., +10000000001).
2. Follow onboarding prompts: welcome → name → role → job experience → location → credentials.
3. Expected replies are deterministic and based on seeded user state.

## Seeding Details

Seeded demo users:

- Demo Customer: external_id=demo-customer-1, phone=+10000000001
- Demo Contractor: external_id=demo-contractor-1, phone=+10000000002

Seeded jobs:

- demo-job-1: Fix leaky faucet (open)
- demo-job-2: Install shelves (in_progress)
- demo-job-3: Paint fence (completed)

## Acceptance Tests

Checklist:

- [ ] Container starts with no errors
- [ ] /webhook/whatsapp endpoint responds 200
- [ ] Onboarding flow advances for demo users
- [ ] Seeded jobs are queryable via API

Example curl:

```
curl -X POST http://localhost:3000/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"from": "+10000000001", "text": "Hi"}'
```

## Troubleshooting

- Check container logs: `docker logs <container_id>`
- Common issues: missing seed-demo.js, missing dependencies (express), port conflicts
- Ensure DEMO_MODE is set for deterministic behavior

## Owners & Contacts

- WhatsApp Integrator: [name/email]
- Backend Developer: [name/email]
- DevOps: [name/email]
