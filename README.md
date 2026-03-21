# Toast MCP Server

An MCP (Model Context Protocol) server for the Toast restaurant platform. Gives AI assistants structured, safe access to restaurant operations: menus, orders, configuration, and more.

## What This Is

Toast MCP Server connects AI tools (Claude Desktop, Claude Code, or any MCP client) to the Toast POS API. It exposes a curated set of read and write tools that let you query restaurant data, search menus, inspect orders, and even create orders with layered safety controls.

This is **not** a 1:1 API wrapper. It is an opinionated tool surface designed for operational workflows: checking what is on the menu, reviewing today's orders, validating pricing, and monitoring restaurant health.

## Who It Is For

- **Restaurant operators** who want AI assisted access to their Toast data
- **Developers** building automations on top of Toast
- **Automation builders** integrating restaurant operations into AI workflows
- **Teams using Claude** who want natural language access to POS data

## Features

### Read Tools (11)
Query restaurant info, configuration, menus, orders, and system health without modifying anything.

### Write Tools (3, gated)
Price orders, create orders, and update orders. All write operations require explicit opt in through environment variables and per call confirmation.

### Event System
Normalized event types for menu changes, order thresholds, health checks, and more. Ready for webhook ingestion and downstream routing.

### Teams Bridge Foundation
Scaffold for forwarding Toast events to Microsoft Teams channels via incoming webhooks, with MessageCard formatting and severity based color coding.

## What Is Not Yet Supported

- Webhook ingestion (event types are defined but no inbound listener yet)
- Full reporting endpoints (require specific Toast API scopes)
- Partner discovery across management groups
- Bidirectional Teams communication (bot framework, adaptive cards)
- Menu change detection via polling
- Order threshold alerting

See [docs/roadmap.md](docs/roadmap.md) for the full plan.

## Quick Start

### 1. Install

```bash
npm install toast-mcp-server
```

Or clone and build from source:

```bash
git clone https://github.com/matthewmckenzie/toast-mcp-server.git
cd toast-mcp-server
npm install
npm run build
```

### 2. Configure

Copy the example environment file and fill in your Toast API credentials:

```bash
cp .env.example .env
```

At minimum, you need:

```
TOAST_CLIENT_ID=your_client_id
TOAST_CLIENT_SECRET=your_client_secret
TOAST_RESTAURANT_GUID=your_restaurant_guid
```

### 3. Run

```bash
# Via npx (if installed globally or as a dependency)
npx toast-mcp-server

# Or directly
node dist/index.js

# Or in development mode
npm run dev
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TOAST_CLIENT_ID` | Yes | | Toast API client ID |
| `TOAST_CLIENT_SECRET` | Yes | | Toast API client secret |
| `TOAST_RESTAURANT_GUID` | Yes* | | Single restaurant GUID |
| `TOAST_RESTAURANT_GUIDS` | No | | Comma separated list for multi location |
| `TOAST_API_HOST` | No | `https://ws-api.toasttab.com` | Toast API base URL |
| `ALLOW_WRITES` | No | `false` | Enable write tools (price, create, update orders) |
| `DRY_RUN` | No | `true` | Validate write payloads without executing |
| `LOG_LEVEL` | No | `info` | Logging level: debug, info, warn, error |
| `PARTNER_MODE` | No | `false` | Enable partner integration mode |
| `WEBHOOK_SECRET` | No | | Secret for future webhook ingestion |
| `WEBHOOK_PORT` | No | `3100` | Port for future webhook listener |
| `MICROSOFT_TEAMS_WEBHOOK_URL` | No | | Teams incoming webhook URL |
| `MICROSOFT_BRIDGE_ENABLED` | No | `false` | Enable Teams event forwarding |

*Either `TOAST_RESTAURANT_GUID` or `TOAST_RESTAURANT_GUIDS` should be set.

## MCP Client Configuration

### Claude Code

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "toast": {
      "command": "npx",
      "args": ["toast-mcp-server"],
      "env": {
        "TOAST_CLIENT_ID": "your_client_id",
        "TOAST_CLIENT_SECRET": "your_client_secret",
        "TOAST_RESTAURANT_GUID": "your_restaurant_guid"
      }
    }
  }
}
```

### Claude Desktop

```json
{
  "mcpServers": {
    "toast": {
      "command": "node",
      "args": ["/path/to/toast-mcp-server/dist/index.js"],
      "env": {
        "TOAST_CLIENT_ID": "your_client_id",
        "TOAST_CLIENT_SECRET": "your_client_secret",
        "TOAST_RESTAURANT_GUID": "your_restaurant_guid",
        "ALLOW_WRITES": "false",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## Example Usage

### Check connection health

```
Use toast_healthcheck to verify the server is properly connected.
```

Returns authentication status, API connectivity, and configuration summary.

### Search the menu

```
Use toast_search_menu_items with query "burger" to find all burger items on the menu.
```

Returns matching items with their menu context, group, price, and modifiers.

### List today's orders

```
Use toast_list_orders with businessDate "20260321" to see today's orders.
```

Returns recent orders with check details, amounts, server info, and timing.

### Price an order before creating it

```
Use toast_price_order with selections to validate pricing before placing an order.
```

Returns calculated subtotal, tax, and total without creating a real order.

## Write Safety Model

Write operations use three layers of protection:

1. **`ALLOW_WRITES` environment variable** must be set to `true`. When `false` (the default), write tools are not even registered with the MCP server. They are invisible to the client.

2. **`DRY_RUN` environment variable** defaults to `true`. When enabled, write tools validate payloads and return what would happen without executing the operation. Set to `false` only when you are ready for real writes.

3. **`confirm_write` parameter** on each write tool call. The caller must explicitly pass `confirm_write: true` on every invocation. This prevents accidental writes even when the environment is configured for them.

All three layers must be satisfied for a write to execute. This means you cannot accidentally create a real order.

## Tool Reference

### Read Tools

| Tool | Description |
|------|-------------|
| `toast_auth_status` | Verify API credentials and connection status |
| `toast_list_restaurants` | List all configured restaurants with basic info |
| `toast_get_restaurant_info` | Get detailed info for a specific restaurant |
| `toast_get_config_summary` | Revenue centers, dining options, service areas |
| `toast_get_menu_metadata` | Lightweight menu overview (names, counts) |
| `toast_get_menu` | Full menu with items, modifiers, prices |
| `toast_search_menu_items` | Search menu items by keyword |
| `toast_get_order` | Get a specific order by GUID |
| `toast_list_orders` | List recent orders with filters |
| `toast_healthcheck` | Validate config, auth, and connectivity |
| `toast_api_capabilities` | Report available features and permissions |

### Write Tools

| Tool | Description | Safety |
|------|-------------|--------|
| `toast_price_order` | Validate and price a proposed order | Requires `ALLOW_WRITES` |
| `toast_create_order` | Create a real order in Toast | Requires `ALLOW_WRITES` + `DRY_RUN=false` + `confirm_write` |
| `toast_update_order` | Modify an existing order | Requires `ALLOW_WRITES` + `DRY_RUN=false` + `confirm_write` |

See [docs/tools.md](docs/tools.md) for full tool documentation.

## Development

### Build

```bash
npm run build        # Compile TypeScript
npm run clean        # Remove dist/
```

### Test

```bash
npm test             # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # With coverage
```

### Lint

```bash
npm run lint         # Check for issues
npm run lint:fix     # Auto fix
npm run typecheck    # Type checking only
```

### Dev Mode

```bash
npm run dev          # Watch mode with tsx
```

## Architecture

The server is organized into layers: configuration, Toast API client, tool registry, event system, and notification bridge. Tools are curated for operational use cases rather than exposing every API endpoint.

See [docs/architecture.md](docs/architecture.md) for details.

## Roadmap

The project follows a phased plan from core read tools through real time event processing and Teams integration.

See [docs/roadmap.md](docs/roadmap.md) for the full roadmap.

## Toast API Access

This server requires valid Toast API credentials. To obtain them:

1. Register as a Toast partner or contact Toast to get API access
2. Obtain a client ID and client secret
3. Get the restaurant GUID(s) for the location(s) you want to access

Toast API access is subject to Toast's terms of service and partner agreements. This project is not affiliated with or endorsed by Toast, Inc.

## License

MIT. See [LICENSE](LICENSE).
