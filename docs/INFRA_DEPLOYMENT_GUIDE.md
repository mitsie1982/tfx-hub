docs/INFRA_DEPLOYMENT_GUIDE.md

Deployment workflow (recommended)
1. Developer opens PR with Terraform changes.
2. CI runs validate and plan; plan artifact is uploaded.
3. Reviewer inspects plan and approves PR.
4. Merge triggers a protected 'apply' workflow that requires:
   - A service principal or deployer role with least privilege.
   - Manual approval step (GitHub Environments) for production.
5. Apply runs in a controlled environment with logs exported to central storage.

GitHub Actions example (apply job) should run only after manual approval and use short-lived credentials.
