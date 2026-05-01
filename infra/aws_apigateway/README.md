infra/aws_apigateway — README

Purpose:
  Terraform module to provision AWS API Gateway (HTTP API).

Notes:
  - For advanced features (usage plans, API keys, WAF, custom domain), extend this module.
  - Use AWS Cognito or an external OIDC provider for OAuth2/JWT.
  - Store secrets in AWS Secrets Manager and use IAM roles for deployments.

Usage:
  terraform init
  terraform plan -var 'api_name=tfxhub-api' -var 'aws_region=eu-west-1'
