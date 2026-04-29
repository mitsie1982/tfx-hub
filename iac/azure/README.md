# Azure Bicep Starter

## Modules Included
- VNet, subnets
- AKS with GPU and default node pools
- PostgreSQL Flexible Server (multi-zone)
- Storage with logging/retention
- Key Vault and Managed HSM
- Private Endpoints
- RBAC assignments
- OPA policy example
- POPIA logging/retention
- Incident response playbook

## Usage
1. Edit parameters in `main.bicep` or use parameter files.
2. Deploy with `az deployment group create ...`.
3. Use `incident_playbook.ps1 -UserOrAgentId <id>` for incident response.

## Compliance
- POPIA: Logging, retention, encryption, private endpoints.
- OPA: Admission control policy example in `opa_policy.rego`.

---
