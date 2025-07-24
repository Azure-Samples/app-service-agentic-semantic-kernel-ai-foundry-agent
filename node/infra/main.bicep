@description('Environment name for the resources')
param envName string
@description('Location for all resources')
param location string = resourceGroup().location

var webAppHash = toLower(substring(uniqueString(envName), 0, 7))
var webAppName = '${envName}-node-${webAppHash}'

resource appServicePlan 'Microsoft.Web/serverfarms@2024-11-01' = {
  name: webAppName
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
    size: 'B1'
    capacity: 1
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2024-11-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      alwaysOn: true
      appSettings: [
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
      ]
    }
  }
  identity: {
    type: 'SystemAssigned'
  }
  tags: {
    'azd-service-name': 'web'
  }
}

output AZURE_LOCATION string = location
output SERVICE_WEB_IDENTITY_PRINCIPAL_ID string = webApp.identity.principalId
output SERVICE_WEB_NAME string = webApp.name
output SERVICE_WEB_URI string = 'https://${webApp.properties.defaultHostName}'
