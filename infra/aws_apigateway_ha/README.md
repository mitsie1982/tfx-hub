infra/aws_apigateway_ha — README

Purpose:
  Terraform module to provision AWS API Gateway (HTTP API) in multiple regions for high-availability.

Features:
  - Deploys API Gateway in two AWS regions
  - Example for cross-region failover (extend with Route53 health checks)
  - Suitable for 99.9%+ SLA and enterprise workloads

Usage:
  terraform init
  terraform plan -var 'api_name=tfxhub-api-ha' -var 'primary_region=eu-west-1' -var 'secondary_region=eu-central-1'
