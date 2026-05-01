# API Gateway Integration Summary

## Azure API Management
- **Provision APIM Premium** for enterprise SLAs and multi‑region availability.
- **Authentication**: integrate with **Azure AD** and enforce **JWT validation** at the gateway.
- **Secrets**: store certificates and keys in **Azure Key Vault**; use Managed Identity for access.
- **Edge and protection**: front APIM with **Azure Front Door** and **WAF** for DDoS and OWASP protections.
- **Observability and analytics**: enable **Application Insights** and export logs to Log Analytics; configure alerts and dashboards.
- **Infra as code**: manage APIM, policies and APIs with **Terraform** (or Bicep) and deploy via GitHub Actions with gated plan/apply.

## AWS API Gateway
- **Deploy API Gateway (HTTP or REST)** depending on feature needs; choose REST for advanced features, HTTP for cost efficiency.
- **Authentication**: use **Amazon Cognito** or an external **OIDC** provider for OAuth2/JWT flows; enforce JWT authorizers.
- **Secrets**: store API keys and client secrets in **AWS Secrets Manager**; use IAM roles for service access.
- **Edge and protection**: use **CloudFront** + **AWS WAF** in front of API Gateway for global edge protection and caching.
- **Observability**: enable **CloudWatch** metrics/logs and **AWS X‑Ray** tracing; export logs to a central SIEM.
- **Infra as code**: manage API Gateway, usage plans and custom domains with **Terraform** and deploy via GitHub Actions with gated plan/apply.

## Rollout and Governance
- **Branching and PRs**: implement feature branches for gateway changes; require PR review and plan inspection before apply.
- **Manual approval for production**: use GitHub Environments or equivalent to require manual approval for production `terraform apply`.
- **RBAC**: enforce least privilege roles:
  - **API Admin** — manage APIs and products (limited scope).
  - **DevOps Deployer** — run CI/CD apply jobs (use service principal / deployer role).
  - **Support ReadOnly** — read access for troubleshooting and logs.
- **Rate limits and quotas**: implement per‑key rate limits and usage plans; require manual onboarding for high‑volume keys.
- **Secrets and key lifecycle**: never store plaintext keys in repo; show API keys once at creation, store only hashes, provide rotation and revocation APIs.
- **Security and testing**: enable WAF, TLS, JWT validation, run contract tests, penetration tests and a privacy review before public launch.
- **Pilot and scale**: run a partner pilot (2–3 integrations), monitor metrics and abuse signals, then scale to production with documented SLOs and runbooks.
