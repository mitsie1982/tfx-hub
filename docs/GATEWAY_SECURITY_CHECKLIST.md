docs/GATEWAY_SECURITY_CHECKLIST.md

Security checklist (APIM & API Gateway)
- Use TLS with custom domain and managed certificates.
- Enforce JWT/OAuth2 for protected APIs; use Azure AD or Cognito as identity provider.
- Store secrets in Key Vault / Secrets Manager; use Managed Identities / IAM roles for access.
- Implement WAF in front of gateway (Azure Front Door / AWS WAF).
- Enable logging and export to SIEM; set alerts for abnormal traffic.
- Implement per-key rate limits and quotas; require manual onboarding for high-volume keys.
- Rotate keys regularly and provide rotation APIs.
- Conduct penetration testing and contract audits before public launch.
