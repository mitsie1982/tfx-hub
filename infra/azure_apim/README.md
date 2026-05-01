infra/azure_apim — README

Purpose:
  Terraform module to provision Azure API Management (APIM).

Notes:
  - Use APIM Premium for multi-region HA and dedicated gateways.
  - Configure custom domain and TLS via azurerm_api_management_custom_domain (not included).
  - Use Azure Key Vault for certificates and secrets.
  - Integrate with Azure AD for OAuth2/JWT validation.

Usage:
  terraform init
  terraform plan -var 'resource_group_name=rg-name' -var 'apim_name=apim-name' -var 'publisher_name=TFX Hub' -var 'publisher_email=ops@example.com'
