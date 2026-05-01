# SLA, Compliance, and Incident Response

## Service Level Agreement (SLA)
- **Uptime Commitment:** 99.9%+ monthly uptime, excluding scheduled maintenance (max 43.2 min downtime/month).
- **Support Response:** Critical incidents: 1 hour; High: 4 hours; Normal: 1 business day.
- **Remediation:** Service credits for breach of SLA, as per contract.

## Compliance
- **POPIA/GDPR:**
  - All personal data encrypted at rest and in transit (TLS 1.2+).
  - Data subject rights: export, delete, rectify on request.
  - Access controls: least privilege, audit logs for all admin actions.
  - Data residency: customer data stored in-region (EU, ZA, etc.).
- **Security:**
  - Annual third-party penetration test and quarterly vulnerability scans.
  - All secrets managed in Azure Key Vault/AWS Secrets Manager.
  - Regular review of access and permissions.

## Incident Response
- **Detection:** 24/7 monitoring with automated alerting (Azure Monitor, AWS CloudWatch, SIEM).
- **Escalation:** On-call engineer paged for P1/P2 incidents; incident manager coordinates response.
- **Communication:** Customer notified within 2 hours of confirmed incident affecting SLA.
- **Postmortem:** Root cause analysis and public postmortem for all P1/P2 incidents.
- **Testing:** Quarterly incident response drills and tabletop exercises.

---

**Contact:** security@tfxhub.example.com | [Status Page](https://status.tfxhub.example.com)
