# Roadmap

This document outlines the development plan for the Toast MCP Server, organized
in phases from the current release through future capabilities.

## v0.1 (Core Foundation)

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
- Event types defined: restaurant.connected, menu.changed, order.created,
  order.threshold_alert, health.check_failed, and more
- Typed pub/sub emitter with wildcard support

### Infrastructure
- Zod validated configuration with .env support
- OAuth client credentials auth with token caching and refresh
- Retry logic with exponential backoff
- Structured logging with sensitive field redaction
- TypeScript strict mode, ESLint, Vitest test framework

## v0.2 (Microsoft Integration) [Current]

**Status**: In Progress

### Streamable HTTP Transport
- Dual transport support: stdio (local) and HTTP (cloud)
- Copilot Studio compatible Streamable HTTP endpoint at `/mcp`
- Session management with automatic cleanup
- Health check endpoint at `/health`

### Authentication
- API key authentication via Bearer token or X-API-Key header
- Microsoft Entra ID (Azure AD) JWT validation
- Warning when running HTTP transport without auth

### Adaptive Cards
- Replaced deprecated MessageCard format with Adaptive Cards v1.5
- Specialized card templates for menu changes, order alerts, and health checks
- Power Automate workflow webhook delivery (replaces deprecated incoming webhooks)
- FactSet layouts, severity color coding, icon indicators

### Cloud Deployment
- Dockerfile with multi stage build
- Azure Container Apps deployment guide
- Azure App Service deployment guide
- Azure API Management gateway pattern documented

### Copilot Studio Integration
- Direct MCP connection guide for Copilot Studio agents
- Automatic tool discovery documentation
- Agent instruction templates
- Publish to Teams workflow

## Next: v0.3 (Live Events)

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

## Future: v0.4+ (Intelligence and Agents)

### Teams SDK Bot
- Full Teams bot using McpClientPlugin to consume Toast MCP tools
- Adaptive Card responses for rich data display in Teams
- Proactive messaging for operational alerts (order thresholds, health failures)
- Conversation context for follow up queries
- Single tenant Azure bot registration

### Copilot Studio Advanced Patterns
- Custom conversation topics for common restaurant workflows
- Knowledge base integration (SOPs, training docs via SharePoint)
- Multi agent orchestration with other MCP servers

### Work IQ Integration
- Consume Work IQ MCP servers (Mail, Teams, SharePoint) alongside Toast data
- Correlate organizational context with restaurant operations
- Example: "Who discussed the menu change in Teams last week?"

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
