# infra/azure_apim/variables.tf
variable "resource_group_name" { type = string }
variable "location" { type = string, default = "South Africa North" }
variable "apim_name" { type = string }
variable "publisher_name" { type = string }
variable "publisher_email" { type = string }
variable "apim_sku" { type = string, default = "Developer_1" }
variable "virtual_network_type" { type = string, default = "" }
variable "tags" { type = map(string), default = {} }
