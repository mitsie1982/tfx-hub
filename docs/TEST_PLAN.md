# TEST PLAN End-to-End Orchestrator Validation

Scope
- Validate rollback, secrets retrieval, infra provisioning, test data seeding and cleanup, self-healing, metrics export, and compliance reporting across dev, staging, prod profiles.

Prerequisites
- Azure CLI authenticated (az login) and access to Key Vaults for dev/staging.
- AWS CLI authenticated and IAM permissions for Secrets Manager and S3 for prod.
- kubectl configured for staging/prod clusters.
- Terraform, Bicep, Pulumi CLIs installed as needed.
- Python3 and required helper scripts present: scripts/no_before_action.py, scripts/approve_action.py, scripts/audited_runner.sh, scripts/audit_verify.py, scripts/notifier.py.
- Monitoring stack (Prometheus or App Insights) reachable from services.

Test Cases

1. Secrets Retrieval
- Objective: Confirm secrets helper fetches secrets from configured vault.
- Steps:
  1. Ensure secret AGENT_MANAGER_SECRET exists in the profile vault.
  2. Run: pwsh -NoProfile -File scripts/secrets_helper.ps1 (call Get-SecretFromAzureKeyVault or Get-SecretFromAWSSecretsManager as appropriate).
  3. Verify returned values are non-empty and match expected test values.
- Expected:
  - Secrets are retrieved successfully and printed or returned to caller.
  - No plaintext secrets are written to logs.

2. Infrastructure Provisioning
- Objective: Validate Terraform/Bicep/Pulumi provisioning flow.
- Steps:
  1. Dev: bash infra/terraform/plan.sh
  2. Staging: pwsh infra/bicep/deploy.ps1 -Profile staging (use a non-production resource group)
  3. Prod (dry-run): cd infra/pulumi && pulumi preview
- Expected:
  - Terraform plan completes without errors.
  - Bicep deployment command validates template and returns deployment operation.
  - Pulumi preview shows intended changes.
- Rollback validation:
  - Introduce a failing resource (e.g., invalid VM size) and confirm plan/apply fails; ensure rollbackSteps are ready to run.

3. Automated Rollback on Failure
- Objective: Confirm orchestrator triggers rollback when a step fails.
- Steps:
  1. Create a workflow step that intentionally fails (e.g., shell command exit 1).
  2. Run orchestrator: pwsh ./scripts/orchestrator_runner.ps1 -Profile staging -Workflow workflows/failure_test.yaml
  3. Observe logs out/orchestrator.log and notifier messages.
- Expected:
  - Orchestrator logs the failure, runs Trigger-Rollback, executes rollbackSteps from profile, and sends failure notification.
  - Post-rollback health check passes or reports expected state.

4. Test Data Seeding and Cleanup
- Objective: Ensure seed and cleanup scripts operate and leave environment clean.
- Steps:
  1. Run: pwsh ./scripts/testdata_seed.ps1 -Profile dev
  2. Verify test data exists via API or DB query.
  3. Run: pwsh ./scripts/testdata_cleanup.ps1 -Profile dev
  4. Verify test data removed.
- Expected:
  - Seed creates expected test records.
  - Cleanup removes test records and leaves production data untouched.

5. Self-Healing Automation
- Objective: Validate automatic remediation actions restart failed services.
- Steps:
  1. Simulate a failure: kill a container or crash a pod.
  2. Run self-heal: pwsh ./scripts/self_heal.ps1 -Profile staging
  3. Observe actions: container restart, pod deletion, remediation playbook execution.
- Expected:
  - Failed service is restarted or replaced.
  - Remediation playbook runs and logs actions to out/remediation.log.

6. Metrics and Telemetry Export
- Objective: Confirm Prometheus scraping and App Insights telemetry ingestion.
- Steps:
  1. Ensure metrics exporter endpoint is reachable (configs/prod.yaml target).
  2. Curl metrics endpoint: curl http://metrics-exporter:9100/metrics
  3. For App Insights, verify instrumentation key secret retrieval and that services expose telemetry.
- Expected:
  - Prometheus endpoint returns metrics in text format.
  - App Insights receives telemetry events (verify via Azure portal or API).

7. Compliance Checks and Reporting
- Objective: Run compliance checks and generate report.
- Steps:
  1. Run: pwsh ./compliance/run_compliance_checks.ps1 -Profile prod
  2. Inspect out/compliance_report_prod.json
  3. Run GitHub Actions workflow .github/workflows/compliance.yml (or trigger manually).
- Expected:
  - Compliance report generated with terraform_valid and tfsec results.
  - Workflow uploads report artifact.

8. End-to-End Smoke Test
- Objective: Validate full flow: provision, deploy, seed, run workflow, fail, rollback, verify metrics and compliance.
- Steps:
  1. Provision minimal infra in a sandbox environment.
  2. Deploy services (docker-compose or k8s).
  3. Seed test data.
  4. Run orchestrator with a workflow that includes a failing step to trigger rollback.
  5. Verify rollback executed, services healthy, metrics present, compliance report generated.
- Expected:
  - Orchestrator completes the run, triggers rollback on failure, notifications sent, metrics and compliance artifacts available.

Verification and Evidence
- Collect logs: out/orchestrator.log, out/health.log, out/compliance_report_*.json, out/action_audit.log.
- Save notifier outputs or webhook receipts.
- For each test, record timestamp, profile, commands run, and artifacts produced.

Cleanup
- Remove sandbox resources after tests: run infra cleanup scripts or terraform destroy in sandbox.
- Run testdata cleanup scripts to remove seeded data.

Failure Modes and Remediation
- Secrets not found: verify vault access and permissions; check vaultName and secret names in configs.
- Rollback steps fail: inspect rollback logs and run manual rollback commands; escalate if needed.
- Metrics missing: verify exporter is running and network rules allow scraping.

Acceptance Criteria
- Secrets retrieved securely from vaults.
- Automated rollback executes on failure and restores a known-good state.
- Test data seeding and cleanup succeed without affecting production data.
- Self-healing actions restart or remediate failed services automatically.
- Metrics are exported and visible in Prometheus or App Insights
