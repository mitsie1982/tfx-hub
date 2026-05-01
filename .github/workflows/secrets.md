# CI/CD Pipeline Secrets Guide

- Store secrets (API keys, DB URLs, Sentry DSN, etc.) in GitHub Actions repository settings under Settings > Secrets and variables > Actions.
- Reference secrets in workflow YAML using `${{ secrets.SECRET_NAME }}`.
- Example:
  ```yaml
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
    BLOCKCHAIN_ADMIN_PRIVATE_KEY: ${{ secrets.BLOCKCHAIN_ADMIN_PRIVATE_KEY }}
  ```
- Never commit secrets to source code.
