## Secret Management Upgrade: Azure Key Vault

All secrets (API keys, DB passwords, tokens) should be stored in Azure Key Vault.

### Steps:
1. Store secrets in Azure Key Vault (see Azure Portal or az CLI).
2. Reference secrets in GitHub Actions using the Key Vault integration workflow.
3. Rotate secrets regularly and automate validation (see .github/workflows/keyvault_integration.yml).

### Recovery & Rotation
- Rotate secrets in Key Vault, update references in GitHub secrets if needed.
- Use make rollback for model version rollback if a secret-related deployment fails.

### References
- [Azure Key Vault Docs](https://learn.microsoft.com/en-us/azure/key-vault/)
- [GitHub Actions Key Vault Integration](https://learn.microsoft.com/en-us/azure/key-vault/secrets/ci-cd)
