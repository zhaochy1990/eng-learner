targetScope = 'subscription'

// ============================================================
// Parameters
// ============================================================

@description('Azure region for all resources')
param location string = 'southeastasia'

@description('Existing common resource group name')
param commonResourceGroupName string = 'rg-common-prod'

@description('Project resource group name (created if not exists)')
param projectResourceGroupName string = 'rg-english-learning-prod'

@description('Existing Log Analytics workspace name in common RG')
param logAnalyticsWorkspaceName string = 'common-logs'

@description('SQL Server administrator login')
param sqlAdminLogin string

@description('SQL Server administrator password')
@secure()
param sqlAdminPassword string

@description('Azure OpenAI endpoint URL')
param azureOpenAiEndpoint string

@description('Azure OpenAI API key')
@secure()
param azureOpenAiApiKey string

@description('Azure OpenAI deployment name')
param azureOpenAiDeployment string = 'gpt-4.1'

@description('API container image. Leave empty for placeholder.')
param apiImage string = ''

@description('Frontend container image. Leave empty for placeholder.')
param frontendImage string = ''

@description('JWT public key PEM content for auth token verification')
@secure()
param jwtPublicKey string

// ============================================================
// Variables
// ============================================================

var tags = { project: 'english-learning' }
var commonToken = toLower(uniqueString(subscription().subscriptionId, commonResourceGroupName))

// ============================================================
// Resource Groups
// ============================================================

resource commonRg 'Microsoft.Resources/resourceGroups@2021-04-01' existing = {
  name: commonResourceGroupName
}

resource projectRg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: projectResourceGroupName
  location: location
  tags: tags
}

// ============================================================
// Managed Identity (project RG — used for SQL Entra ID auth)
// ============================================================

module identity 'modules/identity.bicep' = {
  scope: projectRg
  name: 'identity'
  params: {
    name: 'id-english-learning'
    location: location
    tags: tags
  }
}

// ============================================================
// SQL Server + Database (common RG — shared infrastructure)
// ============================================================

module sql 'modules/sql.bicep' = {
  scope: commonRg
  name: 'sql-english-learning'
  params: {
    serverName: 'sql-common-${commonToken}'
    location: location
    tags: tags
    adminLogin: sqlAdminLogin
    adminPassword: sqlAdminPassword
    databaseName: 'english-learning'
    aadAdminName: identity.outputs.name
    aadAdminObjectId: identity.outputs.principalId
  }
}

// ============================================================
// Container Apps (project RG — uses Log Analytics from common RG)
// ============================================================

module containerApps 'modules/container-apps.bicep' = {
  scope: projectRg
  name: 'container-apps'
  params: {
    location: location
    tags: tags
    managedIdentityId: identity.outputs.id
    managedIdentityClientId: identity.outputs.clientId
    commonResourceGroupName: commonResourceGroupName
    logAnalyticsWorkspaceName: logAnalyticsWorkspaceName
    sqlServerFqdn: sql.outputs.serverFqdn
    sqlDatabaseName: sql.outputs.databaseName
    azureOpenAiEndpoint: azureOpenAiEndpoint
    azureOpenAiApiKey: azureOpenAiApiKey
    azureOpenAiDeployment: azureOpenAiDeployment
    apiImage: apiImage
    frontendImage: frontendImage
    jwtPublicKey: jwtPublicKey
  }
}

// ============================================================
// Outputs
// ============================================================

output apiUrl string = containerApps.outputs.apiUrl
output frontendUrl string = containerApps.outputs.frontendUrl
output sqlServerFqdn string = sql.outputs.serverFqdn
output sqlDatabaseName string = sql.outputs.databaseName
output managedIdentityClientId string = identity.outputs.clientId
output managedIdentityName string = identity.outputs.name
output projectResourceGroup string = projectRg.name
