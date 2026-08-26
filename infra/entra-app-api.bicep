extension microsoftGraphV1

@description('Unique name of the existing Entra application')
param applicationUniqueName string

@description('Generated client ID of the existing Entra application')
param applicationClientId string

@description('Display name of the existing Entra application')
param applicationDisplayName string

resource app 'Microsoft.Graph/applications@v1.0' = {
  uniqueName: applicationUniqueName
  displayName: applicationDisplayName
  identifierUris: [
    'api://${applicationClientId}'
  ]
  api: {
    requestedAccessTokenVersion: 2
  }
}

output audience string = 'api://${applicationClientId}'
