// Private endpoints and RBAC
resource privateEndpoint 'Microsoft.Network/privateEndpoints@2023-02-01' = {
  name: 'main-pe'
  location: location
  properties: {
    subnet: {
      id: vnet.properties.subnets[0].id
    }
    privateLinkServiceConnections: []
  }
}

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, 'app-role')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'acdd72a7-3385-48ef-bd42-f606fba81ae7') // Reader
    principalId: aks.identity.principalId
    principalType: 'ServicePrincipal'
  }
}
