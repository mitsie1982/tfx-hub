# infra/aws_apigateway_ha/variables.tf
variable "primary_region" { type = string, default = "eu-west-1" }
variable "secondary_region" { type = string, default = "eu-central-1" }
variable "api_name" { type = string }
variable "stage_name" { type = string, default = "prod" }
