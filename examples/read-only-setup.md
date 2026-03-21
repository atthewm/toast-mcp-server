# Read Only Setup

The default and recommended configuration for most users.

## Environment

```
TOAST_CLIENT_ID=your_client_id
TOAST_CLIENT_SECRET=your_client_secret
TOAST_RESTAURANT_GUID=your_restaurant_guid
ALLOW_WRITES=false
LOG_LEVEL=info
```

## Available Tools

With this configuration, you get 11 read tools:

| Tool | Purpose |
|------|---------|
| `toast_auth_status` | Verify credentials |
| `toast_list_restaurants` | List configured locations |
| `toast_get_restaurant_info` | Restaurant details |
| `toast_get_config_summary` | Revenue centers, dining options, service areas |
| `toast_get_menu_metadata` | Menu overview (lightweight) |
| `toast_get_menu` | Full menu with items and modifiers |
| `toast_search_menu_items` | Search items by keyword |
| `toast_get_order` | Get order by GUID |
| `toast_list_orders` | List orders with filters |
| `toast_healthcheck` | Full connectivity check |
| `toast_api_capabilities` | Feature availability summary |

## Example Queries

Once connected, ask your MCP client questions like:

- "What menus are available?"
- "Search the menu for espresso"
- "Show me today's orders"
- "What dining options does this restaurant have?"
- "Run a health check"
