@description('SQL Server name')
param serverName string

@description('Azure region')
param location string

@description('Resource tags')
param tags object

@description('SQL administrator login')
param adminLogin string

@description('SQL administrator password')
@secure()
param adminPassword string

@description('Database name')
param databaseName string

@description('AAD admin display name (managed identity name)')
param aadAdminName string

@description('AAD admin object ID (managed identity principal ID)')
param aadAdminObjectId string

resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: serverName
  location: location
  tags: tags
  properties: {
    administratorLogin: adminLogin
    administratorLoginPassword: adminPassword
    version: '12.0'
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
  }
}

// Entra ID admin — allows managed identity to authenticate via AAD
resource aadAdmin 'Microsoft.Sql/servers/administrators@2023-08-01-preview' = {
  parent: sqlServer
  name: 'ActiveDirectory'
  properties: {
    administratorType: 'ActiveDirectory'
    login: aadAdminName
    sid: aadAdminObjectId
    tenantId: subscription().tenantId
  }
}

// Free tier: GP Serverless Gen5, 100k vCore-seconds + 32 GB/month free
resource database 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  parent: sqlServer
  name: databaseName
  location: location
  tags: tags
  sku: {
    name: 'GP_S_Gen5'
    tier: 'GeneralPurpose'
    family: 'Gen5'
    capacity: 2
  }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes: 34359738368 // 32 GB
    autoPauseDelay: 60 // pause after 60 min idle
    minCapacity: json('0.5')
    useFreeLimit: true
    freeLimitExhaustionBehavior: 'AutoPause'
  }
}

// Allow Azure services (Container Apps) to reach SQL Server
resource firewallAllowAzure 'Microsoft.Sql/servers/firewallRules@2023-08-01-preview' = {
  parent: sqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

output serverFqdn string = sqlServer.properties.fullyQualifiedDomainName
output databaseName string = database.name
output serverId string = sqlServer.id
