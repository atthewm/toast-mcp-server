# Roadmap

This document outlines the development plan for the Toast MCP Server, organized in phases from the current release through future capabilities.

## Current: v0.1 (Core Foundation)

**Status**: Complete

### Read Tools
- Authentication status and health checking
- Restaurant info and configuration summary
- Menu metadata, full menu retrieval, and menu search
- Order retrieval and listing with pagination
- API capabilities reporting

### Write Tools (Gated)
- Order pricing/validation
- Order creation with three layer safety (ALLOW_WRITES, DRY_RUN, confirm_write)
- Order update with the same safety model

### Event System
- Normalized event envelope format with typed payloads
- Event types defined: restaurant.connected, menu.changed, order.created, order.threshold_alert, health.check_failed, and more
- Typed pub/sub emitter with wildcard support

### Teams Bridge Scaffold
- NotificationBridge interface for extensible outbound notifications
- Teams implementation with MessageCard formatting
- Severity based color coding
- Webhook delivery with error handling

### Infrastructure
- Zod validated configuration with .env support
- OAuth client credentials auth with token caching and refresh
- Retry logic with exponential backoff
- Structured logging with sensitive field redaction
- TypeScript strict mode, ESLint, Vitest test framework

## Next: v0.2 (Live Events)

### Webhook Ingestion
- HTTP listener for Toast webhook callbacks
- Signature validation using WEBHOOK_SECRET
- Transform inbound webhooks into normalized event envelopes
- Route events through the emitter to all registered handlers

### Polling Engine
- Configurable polling intervals for endpoints that do not support webhooks
- Menu change detection: compare current menu state against last known state
- Order volume tracking: count orders per time window and emit threshold alerts
- Health monitoring: periodic auth and connectivity checks

### Real Event Emission
- Connect webhook and polling sources to the event emitter
- Enable the Teams bridge to receive and forward live events
- Add event logging and replay capability

## Future: v0.3+ (Intelligence and Integration)

### Teams Bot Framework
- Replace incoming webhooks with a proper Teams bot registration
- Support Adaptive Cards for richer formatting and interactivity
- Enable bidirectional communication: respond to Teams messages with Toast data queries
- Thread management for ongoing operational conversations

### Work IQ and Copilot Integration
- Publish Toast events as Work IQ signals
- Build Copilot agent plugins for natural language restaurant queries
- Support declarative agent manifests for Microsoft 365 Copilot

### Reporting Tools
- Revenue summaries by time period, revenue center, and dining option
- Labor cost and scheduling data access
- Payment method breakdowns
- Comparative reporting across locations

### Partner Multi Location Discovery
- Use management group APIs to discover all restaurants under a partner account
- Auto configure new locations as they appear
- Multi location aggregation for reporting and alerting

### Menu Change Detection
- Track menu versions over time
- Detect item additions, removals, and price changes
- Emit structured change events with before/after diffs
- Notify via Teams or other bridges when menus are updated

### Order Threshold Alerting
- Configurable thresholds for order volume per time window
- Alert when volume exceeds or falls below expected ranges
- Support for business hour aware thresholds (peak vs off peak)
- Suppress duplicate alerts within a cooldown window

### Additional Tool Ideas
- `toast_get_labor_summary`: Shift and labor cost data
- `toast_get_revenue_summary`: Revenue by period and category
- `toast_get_payment_summary`: Payment method breakdown
- `toast_void_order`: Void an order (write, gated)
- `toast_get_discounts`: Active discounts and promotions
- `toast_get_employees`: Employee list and roles

## Non Goals (for now)

- Full POS terminal emulation
- Customer facing ordering flows
- Payment processing
- Hardware integration (printers, KDS)
- Real time streaming (Toast does not offer this today)
