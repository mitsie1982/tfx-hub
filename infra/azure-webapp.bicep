// Azure Web App Bicep template for TFX Hub API
param location string = resourceGroup().location
param appName string
param sku string = 'B1'

resource plan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: '${appName}-plan'
  location: location
  sku: {
    name: sku
    tier: 'Basic'
  }
}

resource webapp 'Microsoft.Web/sites@2022-03-01' = {
  name: appName
  location: location
  serverFarmId: plan.id
  siteConfig: {
    appSettings: [
      { name: 'NODE_ENV'; value: 'production' }
      // Add secrets via Azure Key Vault or pipeline
    ]
  }
}

output webappUrl string = webapp.defaultHostName
