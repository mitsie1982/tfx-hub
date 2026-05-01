# infra/aws_apigateway_ha/main.tf
terraform {
  required_version = ">= 1.2.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.0.0"
    }
  }
}

provider "aws" {
  region = var.primary_region
}

resource "aws_apigatewayv2_api" "api" {
  name          = var.api_name
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "stage" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = var.stage_name
  auto_deploy = true
}

# Multi-region: replicate API to secondary region (example, see docs for full solution)
provider "aws" {
  alias  = "secondary"
  region = var.secondary_region
}

resource "aws_apigatewayv2_api" "api_secondary" {
  provider      = aws.secondary
  name          = var.api_name
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "stage_secondary" {
  provider   = aws.secondary
  api_id     = aws_apigatewayv2_api.api_secondary.id
  name       = var.stage_name
  auto_deploy = true
}

output "primary_api_endpoint" {
  value = aws_apigatewayv2_api.api.api_endpoint
}
output "secondary_api_endpoint" {
  value = aws_apigatewayv2_api.api_secondary.api_endpoint
}
