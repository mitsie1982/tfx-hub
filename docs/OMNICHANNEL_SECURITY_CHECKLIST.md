Omnichannel Security Checklist (MVP)

- Use short-lived, single-use tokens for web login links (expiry <= 15 minutes).
- Store tokens hashed in DB; validate and delete on use.
- Use HTTPS for all endpoints; enforce HSTS.
- Validate and sanitize all uploaded files; enforce size/type limits.
- Use provider webhook signature verification for payments.
- Do not log sensitive tokens or PII in plaintext.
- Use secrets manager for provider credentials; do not commit keys.
- Conduct penetration test before production rollout.
