# infra/azure_apim/main.tf
terraform {
  required_version = ">= 1.2.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.0.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# Resource group
resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

# API Management service (Premium recommended for multi-region)
resource "azurerm_api_management" "apim" {
  name                = var.apim_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  publisher_name      = var.publisher_name
  publisher_email     = var.publisher_email
  sku_name            = var.apim_sku # e.g., "Developer_1", "Premium_1"
  virtual_network_type = var.virtual_network_type # Optional: "External" or "Internal"
  tags = var.tags
}

# Example: API (imported from OpenAPI)
# resource "azurerm_api_management_api" "api" { ... }

output "apim_id" {
  value = azurerm_api_management.apim.id
}
