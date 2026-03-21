# Architecture

This document describes the internal architecture of the Toast MCP Server, how the layers fit together, and how to extend it.

## Design Philosophy

The Toast API surface is large. This server does **not** attempt a 1:1 mapping of every endpoint. Instead, the tool surface is curated for operational use cases that restaurant operators and developers actually need:

- Checking restaurant configuration
- Browsing and searching menus
- Reviewing orders
- Validating pricing before order creation
- Monitoring system health

Each tool is designed to return the right level of detail for an AI conversation. For example, `toast_get_menu_metadata` provides a lightweight overview before the caller decides to fetch the full (potentially large) menu payload.

## Layer Separation

```
┌─────────────────────────────────┐
│         MCP Server (stdio)      │
│  @modelcontextprotocol/sdk      │
├─────────────────────────────────┤
│        Tool Registry            │
│  Read tools │ Write tools       │
│  (always)   │ (gated)           │
├─────────────────────────────────┤
│         Toast Client            │
│  Auth, retries, error handling  │
├─────────────────────────────────┤
│       Event System              │
│  Typed events, emitter          │
├─────────────────────────────────┤
│      Notification Bridge        │
│  Teams (scaffold)               │
├─────────────────────────────────┤
│       Configuration             │
│  Zod schema, .env loader        │
└─────────────────────────────────┘
```

### Configuration (`src/config/`)

Configuration is loaded from environment variables with an optional `.env` file. The `ConfigSchema` (defined with Zod) validates all settings at startup and provides clear error messages for missing or invalid values.

Key design decisions:
- `.env` values do not override existing environment variables, so the runtime environment always wins
- Boolean parsing accepts `true`, `1`, and `yes` for flexibility
- Restaurant GUIDs can be provided as a single value or comma separated list
- Validation fails fast at startup rather than at first use

### Toast Client (`src/toast/`)

The `ToastClient` handles all communication with the Toast API:

- **Authentication**: OAuth client credentials flow via `ToastAuth`. Tokens are cached and automatically refreshed 60 seconds before expiry.
- **Retries**: Automatic retry with exponential backoff for 5xx errors, 429 rate limits, and network failures. Up to 3 attempts per request.
- **401 Handling**: On auth failures, the token is cleared and refreshed before retrying.
- **Timeouts**: 30 second default timeout per request with AbortController.
- **Restaurant Header**: Automatically sets `Toast-Restaurant-External-ID` on requests.

The client exposes `get`, `post`, and `patch` convenience methods plus a generic `request` method.

### Tool Registry (`src/tools/registry.ts`)

The `ToolRegistry` is the central coordinator for tool management:

- Stores tool definitions with their Zod input schemas
- **Write gating**: When `ALLOW_WRITES=false`, write tools are silently skipped during registration. They never appear in the MCP tool list.
- **Input validation**: All tool inputs are validated against their Zod schema before execution
- **Error handling**: Execution errors are caught, logged, and returned as structured MCP error responses
- **Sensitive field redaction**: The logger automatically redacts known secret fields

### Read Tools (`src/tools/read/`)

Eleven tools that query Toast data without modification:

| Tool | API Endpoint(s) |
|------|-----------------|
| `toast_auth_status` | Auth verification (no endpoint, checks token) |
| `toast_list_restaurants` | `GET /restaurants/v1/restaurants/{guid}` per GUID |
| `toast_get_restaurant_info` | `GET /restaurants/v1/restaurants/{guid}` |
| `toast_get_config_summary` | Multiple config/v2 endpoints in parallel |
| `toast_get_menu_metadata` | `GET /menus/v2/menus` (summary only) |
| `toast_get_menu` | `GET /menus/v2/menus` or `/menus/v2/menus/{guid}` |
| `toast_search_menu_items` | `GET /menus/v2/menus` + client side search |
| `toast_get_order` | `GET /orders/v2/orders/{guid}` |
| `toast_list_orders` | `GET /orders/v2/orders` with pagination |
| `toast_healthcheck` | Auth + config + API connectivity checks |
| `toast_api_capabilities` | Local config inspection |

### Write Tools (`src/tools/write/`)

Three tools that modify data, each with multiple safety gates:

| Tool | API Endpoint | Safety Layers |
|------|-------------|---------------|
| `toast_price_order` | `POST /orders/v2/orders/price` | `ALLOW_WRITES` |
| `toast_create_order` | `POST /orders/v2/orders` | `ALLOW_WRITES` + `DRY_RUN=false` + `confirm_write` |
| `toast_update_order` | `PATCH /orders/v2/orders/{guid}` | `ALLOW_WRITES` + `DRY_RUN=false` + `confirm_write` |

### Event System (`src/events/`)

The event system provides a normalized envelope format for internal events:

- **Event types**: `restaurant.connected`, `menu.changed`, `order.created`, `order.threshold_alert`, `health.check_failed`, and more
- **Severity levels**: `info`, `warning`, `critical`
- **Emitter**: Simple typed pub/sub with wildcard support. Handlers can subscribe to specific event types or `*` for all events.
- **Error isolation**: Handler errors are logged but never propagate to the emitter

Currently, events are defined but not yet produced by any source. The system is ready for webhook ingestion or polling to begin emitting events.

### Notification Bridge (`src/bridge/`)

The bridge layer defines an interface (`NotificationBridge`) for outbound notifications:

- `formatMessage(event)`: Transform a Toast event into a bridge message
- `send(message)`: Deliver the message to the external system
- `isEnabled()`: Check if the bridge is configured and ready

The `TeamsBridge` implementation:
- Formats events as MessageCard payloads (legacy format for broad compatibility)
- Uses severity based color coding (blue for info, orange for warnings, red for critical)
- Delivers via Teams incoming webhook URL
- Logs delivery success/failure without throwing

## Write Safety in Detail

Write safety is enforced at three levels, each independent:

### Level 1: Registration Gating

When `ALLOW_WRITES=false` (the default), the `ToolRegistry.register()` method silently skips any tool with `requiresWrite: true`. The tool is never registered with the MCP server, so the client cannot even see it exists.

### Level 2: Dry Run

When `DRY_RUN=true` (the default), write tools that are registered will validate the input and return a description of what would happen, but will not make the API call. This is useful for testing and validation.

### Level 3: Per Call Confirmation

The `toast_create_order` and `toast_update_order` tools require `confirm_write: true` in every invocation. If missing or false, the tool returns a message explaining the safety requirement. This prevents accidental writes even when the environment is fully configured for production.

## Extension Points

### Adding a New Read Tool

1. Create a new file in `src/tools/read/` following the existing pattern
2. Export a `ToolDefinition` with name, description, Zod input schema, and execute function
3. Add the export to `src/tools/read/index.ts`
4. Add the export to `src/tools/index.ts`
5. Register it in `src/mcp/server.ts`

### Adding a New Write Tool

Same as above, but in `src/tools/write/`, and set `requiresWrite: true` on the definition. Use the three layer safety pattern from existing write tools.

### Adding a New Notification Bridge

1. Implement the `NotificationBridge` interface in `src/bridge/`
2. Wire it up in `src/mcp/server.ts` similar to the Teams bridge
3. Subscribe to events via `events.on()`

### Adding New Event Types

1. Add the type string to the `EventType` union in `src/events/types.ts`
2. Define a payload interface if the event carries structured data
3. Use `createEvent()` to produce events with automatic ID and timestamp generation
