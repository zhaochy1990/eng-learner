@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('Managed identity resource ID')
param managedIdentityId string

@description('Managed identity client ID')
param managedIdentityClientId string

@description('Common resource group name (for cross-RG Log Analytics reference)')
param commonResourceGroupName string

@description('Existing Log Analytics workspace name in common RG')
param logAnalyticsWorkspaceName string

@description('SQL Server FQDN')
param sqlServerFqdn string

@description('SQL database name')
param sqlDatabaseName string

@description('Azure OpenAI endpoint')
param azureOpenAiEndpoint string

@description('Azure OpenAI API key')
@secure()
param azureOpenAiApiKey string

@description('Azure OpenAI deployment name')
param azureOpenAiDeployment string

@description('API container image')
param apiImage string

@description('Frontend container image')
param frontendImage string

var defaultImage = 'mcr.microsoft.com/k8se/quickstart:latest'
var actualApiImage = !empty(apiImage) ? apiImage : defaultImage
var actualFrontendImage = !empty(frontendImage) ? frontendImage : defaultImage

// ============================================================
// Reference existing Log Analytics from common RG
// ============================================================

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = {
  name: logAnalyticsWorkspaceName
  scope: resourceGroup(commonResourceGroupName)
}

// ============================================================
// Container App Environment
// ============================================================

resource containerAppEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-english-learning'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ============================================================
// Frontend Container App (deployed first — API references its FQDN for CORS)
// ============================================================

resource frontendApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-english-learning-web'
  location: location
  tags: union(tags, { app: 'frontend' })
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
        allowInsecure: false
      }
    }
    template: {
      containers: [
        {
          name: 'frontend'
          image: actualFrontendImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

// ============================================================
// API Container App
// ============================================================

resource apiApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-english-learning-api'
  location: location
  tags: union(tags, { app: 'api' })
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3001
        transport: 'http'
        allowInsecure: false
      }
      secrets: [
        {
          name: 'azure-openai-api-key'
          value: azureOpenAiApiKey
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: actualApiImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'PORT', value: '3001' }
            { name: 'DB_SERVER', value: sqlServerFqdn }
            { name: 'DB_NAME', value: sqlDatabaseName }
            { name: 'DB_PORT', value: '1433' }
            { name: 'DB_ENCRYPT', value: 'true' }
            { name: 'DB_TRUST_SERVER_CERTIFICATE', value: 'false' }
            { name: 'AZURE_CLIENT_ID', value: managedIdentityClientId }
            { name: 'AZURE_OPENAI_ENDPOINT', value: azureOpenAiEndpoint }
            { name: 'AZURE_OPENAI_API_KEY', secretRef: 'azure-openai-api-key' }
            { name: 'AZURE_OPENAI_DEPLOYMENT', value: azureOpenAiDeployment }
            { name: 'CORS_ORIGIN', value: 'https://${frontendApp.properties.configuration.ingress.fqdn}' }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

output apiUrl string = 'https://${apiApp.properties.configuration.ingress.fqdn}'
output frontendUrl string = 'https://${frontendApp.properties.configuration.ingress.fqdn}'
