# infra/aws_apigateway/variables.tf
variable "aws_region" { type = string, default = "us-east-1" }
variable "api_name" { type = string }
variable "stage_name" { type = string, default = "prod" }
