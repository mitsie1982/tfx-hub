# AWS Terraform Starter

## Modules Included
- VPC, subnets, NAT, VPN
- EKS with GPU and default node groups
- RDS (multi-AZ)
- S3 with logging and retention
- KMS CMK and CloudHSM
- Private endpoints (VPC Endpoint)
- IAM roles (RBAC)
- OPA policy example
- POPIA logging/retention
- Incident response playbook

## Usage
1. Copy and edit `terraform.tfvars.example` with your values.
2. Run `terraform init && terraform apply` in this directory.
3. Use `incident_playbook.sh <user_or_agent_id>` for incident response.

## Compliance
- POPIA: Logging, retention, encryption, private endpoints.
- OPA: Admission control policy example in `opa_policy.rego`.

---
