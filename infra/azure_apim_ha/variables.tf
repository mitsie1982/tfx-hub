# infra/azure_apim_ha/variables.tf
variable "resource_group_name" { type = string }
variable "primary_location" { type = string, default = "South Africa North" }
variable "secondary_location" { type = string, default = "West Europe" }
variable "apim_name" { type = string }
variable "publisher_name" { type = string }
variable "publisher_email" { type = string }
variable "tags" { type = map(string), default = {} }
