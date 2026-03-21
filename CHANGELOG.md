# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
