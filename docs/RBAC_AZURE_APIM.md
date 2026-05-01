docs/RBAC_AZURE_APIM.md

Azure RBAC recommendations for APIM
- Roles:
  - API Admin: Can manage APIs, products, policies (assign built-in 'API Management Service Contributor' with scope to APIM resource).
  - API Publisher: Can publish APIs and manage revisions.
  - DevOps Deploy: Limited to resource group and deployment pipelines (use Managed Identity).
  - Support ReadOnly: Reader role for troubleshooting.
- Use Azure AD groups for role assignments.
- Use Privileged Identity Management (PIM) for elevated operations.
- Management plane audit: enable Activity Log and export to Log Analytics.
- Secrets: store certificates and keys in Azure Key Vault; grant access via Managed Identity.
