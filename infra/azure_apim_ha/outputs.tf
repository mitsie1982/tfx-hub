# infra/azure_apim_ha/outputs.tf
output "apim_name" { value = azurerm_api_management.apim.name }
output "apim_gateway_url" { value = azurerm_api_management.apim.gateway_url }
output "secondary_gateway_id" { value = azurerm_api_management_gateway.secondary.id }
