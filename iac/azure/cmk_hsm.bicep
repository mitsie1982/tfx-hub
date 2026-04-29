// Azure Key Vault and HSM
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: 'main-keyvault'
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'premium'
    }
    accessPolicies: []
    enablePurgeProtection: true
    enableSoftDelete: true
    enableRbacAuthorization: true
  }
}

resource managedHsm 'Microsoft.KeyVault/managedHSMs@2022-07-01' = {
  name: 'main-hsm'
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: {
      name: 'Standard_B1'
    }
    enablePurgeProtection: true
    enableSoftDelete: true
  }
}
