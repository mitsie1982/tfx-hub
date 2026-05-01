docs/GATEWAY_ROLLOUT_CHECKLIST.md

Combined rollout checklist (APIM & API Gateway)

Phase 0 — Design
- Define APIs, OpenAPI specs, products, and SLAs.
- Define rate limits, tiers and pricing for partners.
- Define identity provider (Azure AD / Cognito) and token flows.

Phase 1 — Infra & Security
- Provision infra in staging: APIM (Developer or Standard) and API Gateway (HTTP API).
- Configure custom domain, TLS, WAF, and logging.
- Configure Key Vault / Secrets Manager and deploy Managed Identities / IAM roles.

Phase 2 — Developer Experience
- Publish OpenAPI, SDKs and developer portal (sandbox keys).
- Implement app registration, key issuance and rotation APIs.

Phase 3 — Pilot
- Onboard 2-3 partners to sandbox; monitor metrics and abuse.
- Validate billing, quotas and support workflows.

Phase 4 — Production
- Promote infra to production (APIM Premium or multi-region API Gateway).
- Enable monitoring, alerts and runbook for incidents.
- Conduct security audit and penetration test.

Phase 5 — Operate
- Monitor usage, rotate keys, review logs and scale gateway capacity as needed.
