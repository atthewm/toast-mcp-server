# Write Enabled Setup

**Warning**: Enabling writes allows the MCP server to create and modify real orders
in your Toast system. Only enable this in controlled environments.

## Safety Layers

The server has three independent safety layers for write operations:

1. **ALLOW_WRITES**: Must be `true` to even register write tools
2. **DRY_RUN**: When `true`, write tools validate but do not execute
3. **confirm_write**: Each write call requires this parameter set to `true`

## Recommended Progression

### Step 1: Validation Only (DRY_RUN mode)

```
TOAST_CLIENT_ID=your_client_id
TOAST_CLIENT_SECRET=your_client_secret
TOAST_RESTAURANT_GUID=your_restaurant_guid
ALLOW_WRITES=true
DRY_RUN=true
```

This registers write tools but they only validate payloads. No state changes occur.

### Step 2: Full Write Access

```
ALLOW_WRITES=true
DRY_RUN=false
```

With this configuration, write tools are fully operational. Use with caution.

## Write Tools Available

| Tool | Risk Level | Description |
|------|-----------|-------------|
| `toast_price_order` | Low | Validates and prices an order without creating it |
| `toast_create_order` | High | Creates a real order (kitchen tickets, charges) |
| `toast_update_order` | High | Modifies an existing order |

## Example: Price Then Create

```
1. Use toast_price_order to validate and get pricing
2. Review the pricing result
3. Use toast_create_order with confirm_write=true to submit
```
