# Deployment Guide

This guide covers deploying the Toast MCP Server for cloud access,
which is required for Copilot Studio, Teams SDK bots, and remote MCP clients.

## Local Development

For local MCP clients (Claude Desktop, Claude Code), no deployment is needed.
Use stdio transport:

```bash
npm run build
MCP_TRANSPORT=stdio node dist/index.js
```

## Docker

### Build

```bash
docker build -t toast-mcp-server .
```

### Run Locally

```bash
docker run -p 3000:3000 \
  -e TOAST_CLIENT_ID=your_id \
  -e TOAST_CLIENT_SECRET=your_secret \
  -e TOAST_RESTAURANT_GUID=your_guid \
  -e MCP_TRANSPORT=http \
  -e MCP_API_KEY=your_api_key \
  toast-mcp-server
```

Test: `curl http://localhost:3000/health`

## Azure Container Apps (Recommended)

Azure Container Apps is the simplest way to deploy for Copilot Studio integration.

### 1. Prerequisites

```bash
az login
az extension add --name containerapp
```

### 2. Create Resources

```bash
RESOURCE_GROUP=toast-mcp-rg
LOCATION=centralus
ENVIRONMENT=toast-mcp-env
APP_NAME=toast-mcp

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Container Apps environment
az containerapp env create \
  --name $ENVIRONMENT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

### 3. Deploy

```bash
# Build and push to Azure Container Registry (or use GitHub Container Registry)
az acr create --name toastmcpregistry --resource-group $RESOURCE_GROUP --sku Basic
az acr login --name toastmcpregistry
docker tag toast-mcp-server toastmcpregistry.azurecr.io/toast-mcp-server:latest
docker push toastmcpregistry.azurecr.io/toast-mcp-server:latest

# Deploy the container app
az containerapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT \
  --image toastmcpregistry.azurecr.io/toast-mcp-server:latest \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --env-vars \
    TOAST_CLIENT_ID=secretref:toast-client-id \
    TOAST_CLIENT_SECRET=secretref:toast-client-secret \
    TOAST_RESTAURANT_GUID=your_guid \
    MCP_TRANSPORT=http \
    MCP_HTTP_HOST=0.0.0.0 \
    MCP_API_KEY=secretref:mcp-api-key
```

### 4. Configure Secrets

```bash
az containerapp secret set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --secrets \
    toast-client-id=your_actual_client_id \
    toast-client-secret=your_actual_client_secret \
    mcp-api-key=your_actual_api_key
```

### 5. Get the URL

```bash
az containerapp show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  --output tsv
```

Your MCP endpoint: `https://<app-name>.<region>.azurecontainerapps.io/mcp`

## Azure App Service

Alternative to Container Apps, using App Service:

```bash
az webapp create \
  --name toast-mcp \
  --resource-group $RESOURCE_GROUP \
  --plan toast-mcp-plan \
  --runtime "NODE:22-lts"

az webapp config appsettings set \
  --name toast-mcp \
  --resource-group $RESOURCE_GROUP \
  --settings \
    MCP_TRANSPORT=http \
    MCP_HTTP_HOST=0.0.0.0 \
    MCP_HTTP_PORT=8080 \
    TOAST_CLIENT_ID=@Microsoft.KeyVault(...) \
    TOAST_CLIENT_SECRET=@Microsoft.KeyVault(...)
```

## Authentication for Production

### API Key (Simple)

Set `MCP_API_KEY` as an environment variable. Clients include it as:
- `Authorization: Bearer <api_key>` header, or
- `X-API-Key: <api_key>` header

### Entra ID / OAuth 2.0 (Enterprise)

1. Register an app in Microsoft Entra ID (Azure AD)
2. Configure the app with an API scope
3. Set environment variables:
   ```
   ENTRA_ID_TENANT_ID=your_tenant_id
   ENTRA_ID_CLIENT_ID=your_client_id
   ENTRA_ID_AUDIENCE=api://your_app_id
   ```
4. Clients authenticate using OAuth 2.0 and include the Bearer token

### Azure API Management (Recommended for Enterprise)

For maximum security, place Azure API Management in front of the server:

1. Create an APIM instance
2. Import the MCP endpoint as an API
3. Configure OAuth 2.0 validation policy
4. Use APIM's public URL as the MCP endpoint in Copilot Studio

This adds rate limiting, DLP controls, audit logging, and VNet integration.

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| TOAST_CLIENT_ID | Yes | | Toast API client ID |
| TOAST_CLIENT_SECRET | Yes | | Toast API client secret |
| TOAST_RESTAURANT_GUID | No | | Default restaurant GUID |
| MCP_TRANSPORT | No | stdio | Transport mode (stdio or http) |
| MCP_HTTP_PORT | No | 3000 | HTTP server port |
| MCP_HTTP_HOST | No | 127.0.0.1 | HTTP server bind address |
| MCP_API_KEY | No | | API key for HTTP auth |
| ENTRA_ID_TENANT_ID | No | | Entra ID tenant for OAuth |
| ALLOW_WRITES | No | false | Enable write tools |
| DRY_RUN | No | true | Validate writes without executing |
| LOG_LEVEL | No | info | Logging verbosity |

## Health Check

The `/health` endpoint is available without authentication:

```bash
curl https://your-server.com/health
# {"status":"ok","version":"0.2.0"}
```

## Monitoring

- Use Azure Monitor or Application Insights for container/app metrics
- Server logs go to stderr in structured JSON format
- Set `LOG_LEVEL=debug` for detailed request/response logging
