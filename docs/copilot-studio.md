# Connecting to Microsoft Copilot Studio

Toast MCP Server can be connected directly to Microsoft Copilot Studio as a tool source.
Copilot Studio's MCP support is GA (since May 2025) and automatically discovers all
tools published by the server.

## Prerequisites

1. The server must be deployed to a **publicly accessible HTTPS endpoint**
   (see [deployment.md](deployment.md))
2. The server must run in **HTTP transport mode** (`MCP_TRANSPORT=http`)
3. Authentication must be configured (`MCP_API_KEY` or Entra ID)
4. A Copilot Studio license (free trial available for development,
   pay as you go at $0.01/credit for production)

## Connection Steps

### 1. Deploy the Server

Deploy to Azure Container Apps, Azure App Service, or any cloud platform.
See [deployment.md](deployment.md) for details.

Your server endpoint will be something like:
```
https://toast-mcp.azurecontainerapps.io/mcp
```

### 2. Connect in Copilot Studio

1. Open [Copilot Studio](https://copilotstudio.microsoft.com)
2. Create a new agent or open an existing one
3. Go to the **Tools** page
4. Select **Add a tool** then **New tool** then **Model Context Protocol**
5. Enter your server URL: `https://your-server.com/mcp`
6. Configure authentication:
   - For API key: select "API Key" and enter your `MCP_API_KEY` value
   - For Entra ID: select "OAuth 2.0" and provide your tenant details
7. Copilot Studio will discover all tools automatically

### 3. Verify Tool Discovery

After connection, you should see these tools available in your agent:

**Read tools (always available):**
- toast_auth_status
- toast_list_restaurants
- toast_get_restaurant_info
- toast_get_config_summary
- toast_get_menu_metadata
- toast_get_menu
- toast_search_menu_items
- toast_get_order
- toast_list_orders
- toast_healthcheck
- toast_api_capabilities

**Write tools (only if ALLOW_WRITES=true on the server):**
- toast_price_order
- toast_create_order
- toast_update_order

### 4. Test the Agent

In the Copilot Studio test panel, try queries like:
- "Run a health check on our Toast system"
- "What menus are available?"
- "Search the menu for espresso"
- "Show me today's orders"

### 5. Publish to Teams

1. Go to **Channels** in Copilot Studio
2. Select **Microsoft Teams**
3. Choose your distribution method (link, app store, or admin deployment)

## Architecture

```
[Teams User] <> [Copilot Studio Agent] <> [Toast MCP Server] <> [Toast API]
```

Copilot Studio handles the AI orchestration, conversation management, and Teams
integration. The MCP server handles Toast authentication, data fetching, and
business logic. This separation means you can update tool behavior without
modifying the Copilot Studio agent.

## Dynamic Tool Updates

When you add, remove, or modify tools on the MCP server, Copilot Studio
discovers the changes automatically on the next interaction. No manual
reconfiguration is needed.

## Security Recommendations

For production deployments:

1. **Always configure authentication** on the HTTP endpoint
2. Use **Entra ID OAuth** for enterprise environments
3. Place the server behind **Azure API Management** for additional controls
4. Keep **ALLOW_WRITES=false** unless write operations are explicitly needed
5. Monitor tool invocations via Copilot Studio's activity map and analytics

## Limitations

- Copilot Studio uses **Streamable HTTP transport** only (not stdio or SSE)
- The server must be reachable from Microsoft's cloud infrastructure
- Large tool responses may be truncated by Copilot Studio's context limits
- Write tools require careful description to prevent unintended invocations
