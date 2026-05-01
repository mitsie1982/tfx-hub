OMNICHANNEL FALLBACK — Feature Brief

Objective:
  Provide a full-featured web and non-WhatsApp channel path so Members without WhatsApp can:
  - Receive Task notifications via SMS or Email
  - Use a secure web dashboard to accept Tasks, upload files, make payments and communicate with the Organisation
  - Experience parity with WhatsApp users for core flows

Scope (MVP):
  - Notification API: /api/omnichannel/notify-member (SMS/Email)
  - One-time web login link: /api/omnichannel/request-web-login
  - Web login verification: /api/omnichannel/verify
  - Dashboard and Task endpoints: /api/omnichannel/tasks, /api/omnichannel/tasks/:id/accept, /api/omnichannel/tasks/:id/upload
  - Payment webhook stub: /api/omnichannel/payments/webhook
  - Feature flags to enable/disable channels

Security and compliance:
  - Use short-lived, single-use tokens for web login links
  - Validate and sign web tokens; store minimal PII in transit
  - Enforce file type and size limits; scan uploads for malware
  - Use secure payment provider webhooks with signature verification

Acceptance criteria:
  - A Member without WhatsApp can receive a notification and open the web dashboard
  - Member can accept a Task and upload a file
  - Payment webhook updates status in DB (stubbed in MVP)
  - All flows are gated by feature flags and covered by unit/integration tests

Next steps:
  - Replace placeholders with provider SDKs and secrets management
  - Implement token persistence and session management
  - Add end-to-end tests and accessibility checks for web UI
  - Coordinate UX copy with product and legal teams
