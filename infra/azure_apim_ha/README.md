infra/azure_apim_ha — README

Purpose:
  Terraform module to provision Azure API Management (APIM) with high-availability and multi-region support.

Features:
  - APIM Premium SKU with zone redundancy
  - Secondary gateway in a different Azure region
  - Suitable for 99.9%+ SLA and enterprise workloads

Usage:
  terraform init
  terraform plan -var 'resource_group_name=rg-name' -var 'apim_name=apim-ha' -var 'publisher_name=TFX Hub' -var 'publisher_email=ops@example.com'
