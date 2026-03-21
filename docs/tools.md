# Tool Reference

Complete documentation for every tool provided by the Toast MCP Server.

## Read Tools

Read tools are always available. They query data from the Toast API without modifying anything.

### toast_auth_status

Verify Toast API credentials and report connection status.

**Inputs**: None

**Outputs**: JSON object with:
- `authenticated`: boolean indicating whether auth succeeded
- `apiHost`: the configured Toast API host
- `hasToken`: whether a valid cached token exists
- `configuredRestaurants`: array of restaurant GUIDs
- `defaultRestaurant`: the default restaurant GUID or null
- `writesEnabled`: whether write operations are enabled
- `dryRun`: whether dry run mode is active
- `partnerMode`: whether partner mode is enabled

**Requires writes**: No

**Example**:
```
Use toast_auth_status to check if the server can connect to Toast.
```

---

### toast_list_restaurants

List configured restaurants with basic info for each.

**Inputs**: None

**Outputs**: JSON object with:
- `count`: number of restaurants
- `restaurants`: array of restaurant info objects (name, GUID, address, timezone) or error entries for restaurants that failed to load

**Requires writes**: No

**Example**:
```
Use toast_list_restaurants to see all configured locations.
```

---

### toast_get_restaurant_info

Get detailed information about a specific restaurant.

**Inputs**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `restaurantGuid` | string | No | Restaurant GUID. Uses default if not provided. |

**Outputs**: JSON object with restaurant details including name, location, address, phone, timezone, and currency code.

**Requires writes**: No

**Example**:
```
Use toast_get_restaurant_info to get details about the default restaurant.
```

```
Use toast_get_restaurant_info with restaurantGuid "abc-123" to get info for a specific location.
```

---

### toast_get_config_summary

Get a summary of restaurant configuration including revenue centers, dining options, and service areas.

**Inputs**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `restaurantGuid` | string | No | Restaurant GUID. Uses default if not provided. |

**Outputs**: JSON object with:
- `restaurantGuid`: the queried restaurant
- `restaurant`: name, timezone, currency code
- `revenueCenters`: array of {guid, name}
- `diningOptions`: array of {guid, name, behavior}
- `serviceAreas`: array of {guid, name}

**Requires writes**: No

**Example**:
```
Use toast_get_config_summary to understand how the restaurant is configured before creating an order.
```

**Notes**: This tool fetches multiple configuration endpoints in parallel for efficiency. It is a good first step before using write tools, since order creation requires a dining option GUID.

---

### toast_get_menu_metadata

Get a lightweight overview of available menus without full item details.

**Inputs**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `restaurantGuid` | string | No | Restaurant GUID. Uses default if not provided. |

**Outputs**: JSON object with:
- `menuCount`: total number of menus
- `menus`: array of {guid, name, groupCount}

**Requires writes**: No

**Example**:
```
Use toast_get_menu_metadata to see how many menus exist and what they are called.
```

**Notes**: Use this before `toast_get_menu` to identify which specific menu you need. Full menus can be large payloads.

---

### toast_get_menu

Get full menu details including groups, items, modifiers, and prices.

**Inputs**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `restaurantGuid` | string | No | Restaurant GUID. Uses default if not provided. |
| `menuGuid` | string | No | Specific menu GUID. If omitted, returns all menus. |

**Outputs**: JSON object (single menu) or array (all menus) with complete menu structure: groups, items with prices, modifier groups, and individual modifiers.

**Requires writes**: No

**Example**:
```
Use toast_get_menu with menuGuid "menu-abc-123" to get the full lunch menu.
```

```
Use toast_get_menu to get all menus for the default restaurant.
```

**Notes**: This can return a large payload, especially for restaurants with extensive menus. Consider using `toast_get_menu_metadata` first.

---

### toast_search_menu_items

Search menu items by name, group, modifier, or keyword across all menus.

**Inputs**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search term to match against item names, groups, descriptions, and modifiers. |
| `restaurantGuid` | string | No | Restaurant GUID. Uses default if not provided. |
| `maxResults` | number | No | Maximum results to return. Default: 20. |

**Outputs**: JSON object with:
- `query`: the search term
- `resultCount`: number of matches
- `results`: array of {item, menuName, groupName, matchField}

**Requires writes**: No

**Example**:
```
Use toast_search_menu_items with query "chicken" to find all chicken items.
```

```
Use toast_search_menu_items with query "gluten" maxResults 10 to find gluten related items.
```

**Notes**: Search is performed client side since Toast does not provide a server side menu search endpoint. The full menu is fetched and searched in memory. Matching is case insensitive and checks item names, descriptions, group names, and modifier names.

---

### toast_get_order

Get details for a specific order by its GUID.

**Inputs**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderGuid` | string | Yes | The GUID of the order to retrieve. |
| `restaurantGuid` | string | No | Restaurant GUID. Uses default if not provided. |

**Outputs**: JSON object with full order details including checks, selections, amounts, server info, timestamps, dining option, and revenue center.

**Requires writes**: No

**Example**:
```
Use toast_get_order with orderGuid "order-abc-123" to get the details of that order.
```

---

### toast_list_orders

List recent orders with optional filters and pagination.

**Inputs**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `restaurantGuid` | string | No | Restaurant GUID. Uses default if not provided. |
| `businessDate` | string | No | Business date in YYYYMMDD format (e.g. 20260321). |
| `pageSize` | number | No | Number of orders to return. Default: 25, max: 100. |
| `pageToken` | string | No | Pagination token from a previous response. |

**Outputs**: JSON object with:
- `count`: number of orders returned
- `orders`: array of order objects

**Requires writes**: No

**Example**:
```
Use toast_list_orders with businessDate "20260321" to see today's orders.
```

```
Use toast_list_orders with pageSize 50 to get the last 50 orders.
```

---

### toast_healthcheck

Validate configuration, authentication, and core API connectivity in one call.

**Inputs**: None

**Outputs**: JSON object with:
- `overall`: "healthy", "degraded", or "unhealthy"
- `checks`: object with individual check results (authentication, restaurantConfig, apiConnectivity), each with status, message, and duration
- `config`: summary of configuration (restaurant count, writes enabled, dry run)

**Requires writes**: No

**Example**:
```
Use toast_healthcheck to make sure everything is working.
```

**Notes**: This tool performs a real API call to verify connectivity. It is the best way to verify the server is properly configured and can reach Toast.

---

### toast_api_capabilities

Summarize which features are available based on current configuration and credentials.

**Inputs**: None

**Outputs**: JSON object with:
- `authentication`: configured and working status
- `restaurants`: count, multi location flag, GUID list
- `readOperations`: availability of each read operation
- `writeOperations`: availability of each write operation, including dry run status
- `integrations`: Teams webhook, bridge, webhook ingestion, partner mode
- `notes`: human readable notes about limitations

**Requires writes**: No

**Example**:
```
Use toast_api_capabilities to understand what this server can do with the current configuration.
```

---

## Write Tools

Write tools modify data in Toast. They require explicit opt in and have multiple safety gates.

### toast_price_order

Validate a proposed order and get pricing without creating the order.

**Inputs**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `restaurantGuid` | string | No | Restaurant GUID. Uses default if not provided. |
| `diningOptionGuid` | string | No | Dining option GUID (dine in, takeout, etc.). |
| `revenueCenterGuid` | string | No | Revenue center GUID. |
| `selections` | array | Yes | Items to price. Each item has `itemGuid` (string), `quantity` (number), optional `modifiers` array, and optional `specialInstructions`. |

**Selection item format**:
```json
{
  "itemGuid": "item-guid-here",
  "quantity": 2,
  "modifiers": [
    { "guid": "mod-guid", "quantity": 1 }
  ],
  "specialInstructions": "No onions"
}
```

**Outputs**: JSON object with:
- `note`: confirmation that no order was created
- `pricing`: the calculated subtotal, tax, and total from Toast

**Requires writes**: Yes (ALLOW_WRITES must be true)

**Example**:
```
Use toast_price_order with selections containing 2x item "abc" to see what it would cost.
```

**Notes**: This is a safe validation step. No order is created, no charges are applied. Use this before `toast_create_order` to verify pricing.

---

### toast_create_order

Create a new order in Toast. This creates a real order that may be sent to the kitchen and result in charges.

**Inputs**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `confirm_write` | boolean | Yes | Must be `true` to proceed. Safety gate. |
| `restaurantGuid` | string | No | Restaurant GUID. Uses default if not provided. |
| `diningOptionGuid` | string | Yes | Dining option GUID. |
| `revenueCenterGuid` | string | No | Revenue center GUID. |
| `selections` | array | Yes | Items to order (same format as toast_price_order). |
| `customerFirstName` | string | No | Customer first name. |
| `customerLastName` | string | No | Customer last name. |
| `customerEmail` | string | No | Customer email. |
| `customerPhone` | string | No | Customer phone. |

**Outputs**:
- If `confirm_write` is false: text explaining the safety requirement
- If `DRY_RUN` is true: text showing what would be created without executing
- If all gates pass: JSON with the created order and a warning that it is real

**Requires writes**: Yes (ALLOW_WRITES=true, DRY_RUN=false, confirm_write=true)

**Example**:
```
Use toast_create_order with confirm_write true, diningOptionGuid "dine-in-guid",
and selections for 1x "burger-guid" to place the order.
```

**Notes**: This tool has the highest safety requirements. All three layers must be satisfied: ALLOW_WRITES=true in the environment, DRY_RUN=false in the environment, and confirm_write=true in the tool call. Consider using toast_price_order first.

---

### toast_update_order

Update an existing order in Toast. This modifies a real order which may affect kitchen operations and charges.

**Inputs**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `confirm_write` | boolean | Yes | Must be `true` to proceed. Safety gate. |
| `orderGuid` | string | Yes | GUID of the order to update. |
| `restaurantGuid` | string | No | Restaurant GUID. Uses default if not provided. |
| `addSelections` | array | No | New items to add to the order (same item format). |

**Outputs**:
- If `confirm_write` is false: text explaining the safety requirement
- If `DRY_RUN` is true: text showing what would change without executing
- If all gates pass: JSON with the updated order and a warning about the modification

**Requires writes**: Yes (ALLOW_WRITES=true, DRY_RUN=false, confirm_write=true)

**Example**:
```
Use toast_update_order with confirm_write true, orderGuid "order-abc",
and addSelections for 1x "dessert-guid" to add a dessert to the order.
```

**Notes**: The tool fetches the existing order first, then patches it with the additions. Same three layer safety model as toast_create_order.
