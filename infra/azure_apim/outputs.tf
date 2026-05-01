# infra/azure_apim/outputs.tf
output "apim_name" { value = azurerm_api_management.apim.name }
output "apim_gateway_url" { value = azurerm_api_management.apim.gateway_url }
