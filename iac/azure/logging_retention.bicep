// Logging and retention for POPIA
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'main-logs'
  location: location
  properties: {
    retentionInDays: 365
    sku: {
      name: 'PerGB2018'
    }
  }
}

resource diagnosticSetting 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'aks-logs'
  scope: aks
  properties: {
    workspaceId: logAnalytics.id
    logs: [
      {
        category: 'kube-apiserver'
        enabled: true
      }
    ]
  }
}
