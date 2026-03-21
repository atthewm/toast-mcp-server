# Copilot Studio Configuration

## Connect Toast MCP Server to Copilot Studio

### Step 1: Deploy the Server

Deploy with HTTP transport enabled. See [../docs/deployment.md](../docs/deployment.md).

Your endpoint will be something like:
```
https://toast-mcp.azurecontainerapps.io/mcp
```

### Step 2: Add MCP Tool in Copilot Studio

1. Open [copilotstudio.microsoft.com](https://copilotstudio.microsoft.com)
2. Create or open an agent
3. Go to **Tools** > **Add a tool** > **New tool** > **Model Context Protocol**
4. Enter your server URL
5. Configure authentication (API Key recommended for simplicity)
6. Tools are discovered automatically

### Step 3: Test

In the test panel, try:
- "What restaurants are configured?"
- "Run a health check"
- "Search the menu for burgers"
- "Show me recent orders"

### Step 4: Publish to Teams

Go to **Channels** > **Microsoft Teams** > choose distribution method.

## Agent Instructions

When creating your Copilot Studio agent, consider adding these instructions
to scope the agent's behavior:

```
You are a restaurant operations assistant connected to the Toast POS system.

You can help with:
- Checking menu items and prices
- Looking up orders and order details
- Reviewing restaurant configuration
- Running system health checks
- Validating order pricing (if writes are enabled)

Always use the toast_healthcheck tool first if a user reports issues.
When searching menus, use toast_search_menu_items rather than fetching the full menu.
Never create or modify orders without explicit confirmation from the user.
```

## Authentication Options

| Method | Setup | Best For |
|--------|-------|----------|
| API Key | Set MCP_API_KEY, enter in Copilot Studio | Quick setup, single agent |
| OAuth 2.0 (Entra ID) | Register app in Entra ID, configure in Copilot Studio | Enterprise, multi agent |
| Azure API Management | Place APIM in front of server | Maximum security, DLP, audit |
