// Azure Bicep: Hyperscale reference deployment
param location string = resourceGroup().location
param appName string

resource plan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: '${appName}-plan'
  location: location
  sku: {
    name: 'P1v2'
    tier: 'PremiumV2'
    capacity: 3 // start with 3 instances, autoscale enabled
  }
}

resource webapp 'Microsoft.Web/sites@2022-03-01' = {
  name: appName
  location: location
  serverFarmId: plan.id
}

resource redis 'Microsoft.Cache/Redis@2023-04-01' = {
  name: '${appName}-redis'
  location: location
  sku: {
    name: 'Standard'
    family: 'C'
    capacity: 1
  }
}

resource cdn 'Microsoft.Cdn/profiles@2021-06-01' = {
  name: '${appName}-cdn'
  location: location
  sku: { name: 'Standard_Microsoft' }
}

resource queue 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: '${appName}queue'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
}

output webappUrl string = webapp.defaultHostName
output redisName string = redis.name
output cdnEndpoint string = cdn.name
output queueName string = queue.name
