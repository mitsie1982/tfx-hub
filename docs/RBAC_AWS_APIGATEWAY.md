docs/RBAC_AWS_APIGATEWAY.md

AWS IAM recommendations for API Gateway
- Roles and policies:
  - apigw-admin: Full management of API Gateway resources (limit to specific accounts).
  - apigw-deployer: Allow CloudFormation/Terraform deploy actions and access to Secrets Manager for certs.
  - apigw-readonly: Read-only access for support and monitoring.
- Use IAM groups and AWS SSO for centralised access.
- Use resource-based policies for custom domain and Lambda integrations.
- Use AWS Organizations SCPs to restrict cross-account changes.
- Logging: enable CloudWatch Logs and API Gateway access logs; export to central SIEM.
