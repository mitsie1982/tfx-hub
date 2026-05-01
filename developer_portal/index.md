# Developer Portal — TFX Hub

Welcome to the TFX Hub Developer Portal.

Quick start:
- Read the OpenAPI spec at `/docs/openapi.yaml`.
- Register an application to obtain API keys.
- Use the sample SDK in `developer_portal/sdk/node`.
- Use webhooks to receive task updates.

Authentication:
- API Key: send `X-API-Key` header.
- OAuth2 Client Credentials: token endpoint available for enterprise partners.

Rate limits:
- Default: 1000 requests per hour per API key (configurable).
- Burst protection and per-endpoint limits apply.

Contact:
- For partner onboarding and higher rate limits, request via the Partner Console.
