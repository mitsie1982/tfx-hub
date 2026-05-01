# infra/azure_apim_ha/main.tf
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

resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.primary_location
}

resource "azurerm_api_management" "apim" {
  name                = var.apim_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  publisher_name      = var.publisher_name
  publisher_email     = var.publisher_email
  sku_name            = "Premium_1"
  virtual_network_type = "External"
  tags = var.tags
  zones = [1,2,3] # Zonal redundancy
}

resource "azurerm_api_management_gateway" "secondary" {
  name                = "secondary-gateway"
  api_management_id   = azurerm_api_management.apim.id
  location            = var.secondary_location
}

output "apim_id" {
  value = azurerm_api_management.apim.id
}
output "secondary_gateway_id" {
  value = azurerm_api_management_gateway.secondary.id
}
