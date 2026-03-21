# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] Microsoft Integration

### Added

- **Streamable HTTP transport**: Dual mode server supporting both stdio (local)
  and HTTP (cloud) transports via `MCP_TRANSPORT` setting
- **Copilot Studio support**: Server is directly connectable to Microsoft
  Copilot Studio agents via the MCP integration wizard
- **API key authentication**: `MCP_API_KEY` environment variable for HTTP
  transport security via Bearer token or X-API-Key header
- **Entra ID authentication**: Microsoft Entra ID (Azure AD) JWT validation
  for enterprise deployments via `ENTRA_ID_TENANT_ID` configuration
- **Adaptive Cards v1.5**: Replaced deprecated MessageCard format with
  Adaptive Cards supporting icons, FactSets, and severity color coding
- **Specialized card templates**: Purpose built Adaptive Cards for menu
  changes, order threshold alerts, and health check notifications
- **Power Automate webhook delivery**: Replaces deprecated incoming
  webhooks (sunset April 2026) with workflow webhook format
- **Dockerfile**: Multi stage build for Azure Container Apps deployment
- **Health endpoint**: `/health` endpoint for container orchestration
- **Session management**: Streamable HTTP sessions with automatic cleanup

### Documentation

- Copilot Studio connection guide (docs/copilot-studio.md)
- Cloud deployment guide for Azure Container Apps and App Service (docs/deployment.md)
- Teams SDK bot example with McpClientPlugin architecture
- Updated roadmap reflecting Microsoft integration phases

## [0.1.0] Initial Release

### Added

- Toast API client with OAuth client credentials authentication
- Token caching and automatic refresh
- Retry with exponential backoff for transient failures
- Configurable timeouts and redaction safe logging
- Multi restaurant support via TOAST_RESTAURANT_GUIDS

### Read Tools

- `toast_auth_status`: Verify API credentials and connection
- `toast_list_restaurants`: List configured restaurant locations
- `toast_get_restaurant_info`: Get restaurant details
- `toast_get_config_summary`: Revenue centers, dining options, service areas
- `toast_get_menu_metadata`: Lightweight menu overview
- `toast_get_menu`: Full menu with items and modifiers
- `toast_search_menu_items`: Search menu items by keyword
- `toast_get_order`: Get order by GUID
- `toast_list_orders`: List orders with filters
- `toast_healthcheck`: Full connectivity validation
- `toast_api_capabilities`: Feature availability summary

### Write Tools (Gated)

- `toast_price_order`: Validate and price a proposed order
- `toast_create_order`: Create a real order (requires ALLOW_WRITES + confirm_write)
- `toast_update_order`: Modify an existing order (requires ALLOW_WRITES + confirm_write)

### Safety

- Read only by default (ALLOW_WRITES=false)
- DRY_RUN mode for write validation without execution
- Explicit confirm_write parameter on all write tools
- Write tools hidden from tool list when disabled

### Infrastructure

- Normalized event envelope types for future automation
- Event emitter for internal event routing
- Microsoft Teams bridge scaffold (MessageCard format)
- Typed configuration with startup validation
- CI workflow for Node 18, 20, 22
- Comprehensive test suite
