@description('Environment name for the resources')
param envName string
@description('Location for all resources')
param location string = resourceGroup().location
@description('Client ID of the Foundry resource managed identity allowed to call the task API')
param foundryAccountClientId string = ''

var webAppHash = toLower(substring(uniqueString(envName), 0, 7))
var webAppName = '${envName}-${webAppHash}'
var appServiceAuthManagedIdentitySettingName = 'OVERRIDE_USE_MI_FIC_ASSERTION_CLIENTID'

resource appServiceAuthIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${webAppName}-auth'
  location: location
}

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
      linuxFxVersion: 'DOTNETCORE|9.0'
      alwaysOn: true
      appSettings: [
        {
          name: appServiceAuthManagedIdentitySettingName
          value: appServiceAuthIdentity.properties.clientId
        }
        {
          name: 'WEBSITE_AUTH_AAD_ALLOWED_TENANTS'
          value: tenant().tenantId
        }
      ]
    }
  }
  identity: {
    type: 'SystemAssigned, UserAssigned'
    userAssignedIdentities: {
      '${appServiceAuthIdentity.id}': {}
    }
  }
  tags: {
    'azd-service-name': 'web'
  }
}

module entraApp 'entra-app.bicep' = {
  name: 'entra-app'
  params: {
    envName: envName
    webAppUrl: 'https://${webApp.properties.defaultHostName}'
    managedIdentityPrincipalId: appServiceAuthIdentity.properties.principalId
  }
}

module entraAppApi 'entra-app-api.bicep' = {
  name: 'entra-app-api'
  params: {
    applicationUniqueName: entraApp.outputs.uniqueName
    applicationClientId: entraApp.outputs.clientId
    applicationDisplayName: entraApp.outputs.displayName
  }
}

resource webAppAuthSettings 'Microsoft.Web/sites/config@2024-11-01' = {
  parent: webApp
  name: 'authsettingsV2'
  properties: {
    #disable-next-line BCP037
    clearInboundClaimsMapping: 'false'
    platform: {
      enabled: true
      runtimeVersion: '~1'
    }
    globalValidation: {
      excludedPaths: []
      requireAuthentication: true
      unauthenticatedClientAction: 'RedirectToLoginPage'
      redirectToProvider: 'azureActiveDirectory'
    }
    identityProviders: {
      azureActiveDirectory: {
        enabled: true
        isAutoProvisioned: true
        login: {
          disableWWWAuthenticate: false
        }
        registration: {
          clientId: entraApp.outputs.clientId
          clientSecretSettingName: appServiceAuthManagedIdentitySettingName
          openIdIssuer: 'https://sts.windows.net/${tenant().tenantId}/v2.0'
        }
        validation: {
          allowedAudiences: [
            'api://${entraApp.outputs.clientId}'
          ]
          defaultAuthorizationPolicy: {
            allowedApplications: concat(
              [
                entraApp.outputs.clientId
              ],
              empty(foundryAccountClientId) ? [] : [foundryAccountClientId]
            )
            allowedPrincipals: {}
          }
        }
      }
    }
    login: {
      cookieExpiration: {
        convention: 'FixedTime'
        timeToExpiration: '08:00:00'
      }
      nonce: {
        nonceExpirationInterval: '00:05:00'
        validateNonce: true
      }
      preserveUrlFragmentsForLogins: false
      tokenStore: {
        enabled: true
        tokenRefreshExtensionHours: 72
      }
    }
    httpSettings: {
      requireHttps: true
    }
  }
}

output AZURE_LOCATION string = location
output SERVICE_WEB_IDENTITY_PRINCIPAL_ID string = webApp.identity.principalId
output SERVICE_WEB_NAME string = webApp.name
output SERVICE_WEB_URI string = 'https://${webApp.properties.defaultHostName}'
output AZURE_AUTH_APP_CLIENT_ID string = entraApp.outputs.clientId
output AZURE_AUTH_APP_OBJECT_ID string = entraApp.outputs.appObjectId
output AZURE_AUTH_APP_AUDIENCE string = entraAppApi.outputs.audience
