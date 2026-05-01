# infra/aws_apigateway/main.tf
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
  region = var.aws_region
}

# API Gateway (HTTP API recommended for cost; use REST API for advanced features)
resource "aws_apigatewayv2_api" "api" {
  name          = var.api_name
  protocol_type = "HTTP"
}

# Stage with auto-deploy
resource "aws_apigatewayv2_stage" "stage" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = var.stage_name
  auto_deploy = true
}

# Usage plan and API key (for simple API key flow)
resource "aws_api_gateway_api_key" "api_key" {
  name = "sample-key"
}

# Example integration and route placeholders
# resource "aws_apigatewayv2_integration" "integration" { ... }
# resource "aws_apigatewayv2_route" "route" { ... }

output "api_endpoint" {
  value = aws_apigatewayv2_api.api.api_endpoint
}
