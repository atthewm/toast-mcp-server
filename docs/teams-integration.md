# Microsoft Teams Integration

This document describes the current state and future vision for integrating Toast events with Microsoft Teams.

## Current State

### Bridge Scaffold

The Teams bridge (`src/bridge/teams.ts`) is fully implemented as a one way notification adapter. When enabled, it listens for all internal Toast events and delivers them to a Teams channel via incoming webhook.

**What is built:**

- `TeamsBridge` class implementing the `NotificationBridge` interface
- MessageCard formatting (legacy format, compatible with all Teams versions)
- Severity based color coding:
  - **Info** (blue, #0076D7): routine events like restaurant connections, menu updates
  - **Warning** (orange, #FFA500): threshold alerts, degraded health
  - **Critical** (red, #FF0000): auth failures, service disruptions
- Structured facts on each card: event type, restaurant GUID, severity, timestamp
- Error handling with logging (delivery failures do not crash the server)
- Event source traceability via `sourceEventId`

**What is not yet producing events:**

The event system types and emitter are in place, but no source (webhook listener or polling engine) is currently emitting events. The bridge will begin working as soon as real events flow through the emitter.

### Configuration

To enable the Teams bridge, set these environment variables:

```
MICROSOFT_TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/your-webhook-url
MICROSOFT_BRIDGE_ENABLED=true
```

The bridge checks both values. If either is missing or false, it silently skips delivery.

## Event Types

The following event types are defined and ready for Teams delivery:

| Event Type | Severity | Description |
|------------|----------|-------------|
| `restaurant.connected` | info | A new restaurant was connected |
| `restaurant.disconnected` | warning | A restaurant was disconnected |
| `menu.changed` | info | Menu content was updated |
| `order.created` | info | A new order was created |
| `order.status_changed` | info | An order's status changed |
| `order.threshold_alert` | warning | Order volume crossed a threshold |
| `item.availability_changed` | info | A menu item's availability changed |
| `service.disruption` | critical | A service disruption was detected |
| `health.check_failed` | critical | A health check failed |
| `health.check_recovered` | info | A health check recovered |

## Future Vision

### Real Time Toast Events to Teams

Once webhook ingestion or polling is implemented (see [roadmap.md](roadmap.md)), events will flow automatically:

```
Toast API → Webhook/Poll → Event Emitter → Teams Bridge → Teams Channel
```

This enables passive monitoring: the restaurant team sees notifications in their Teams channel without having to query anything.

### Notification Patterns

#### Menu Change Notifications

When the polling engine detects a menu change:
- Card title: "Menu Updated: Lunch Menu"
- Facts: changed items count, added/removed items, price changes
- Useful for operations teams that need to verify menu updates were applied correctly

#### Order Volume Alerts

When order count exceeds or falls below configured thresholds:
- Card title: "Warning: High Order Volume"
- Facts: current count, threshold, time period
- Useful for staffing decisions and kitchen capacity management

#### New Location Alerts

When a partner integration detects a new restaurant under the management group:
- Card title: "New Restaurant Connected: Downtown Location"
- Facts: restaurant name, GUID, address
- Useful for multi location operators expanding their footprint

#### Health Alerts

When API connectivity or authentication fails:
- Card title: "ALERT: Toast API Health Check Failed"
- Facts: failure type, duration, last successful check
- Useful for IT teams monitoring integration health

### Work IQ and Copilot Integration

Microsoft Work IQ and Copilot represent the next level of Teams integration:

**Work IQ Signals**: Publish Toast events as Work IQ activity signals. This allows Copilot to surface restaurant context in daily briefings: "Your downtown location had 20% higher order volume than usual yesterday."

**Copilot Agent Plugins**: Build a declarative agent that lets users query Toast data directly from Copilot:
- "What's on the lunch menu at the main location?"
- "How many orders did we do today?"
- "Show me yesterday's revenue breakdown"

**Adaptive Cards with Actions**: Replace MessageCard format with Adaptive Cards that include action buttons:
- "View Full Order" button that queries toast_get_order
- "Acknowledge Alert" button that marks an alert as seen
- "Run Health Check" button that triggers toast_healthcheck

### Bot Framework

Moving from incoming webhooks to a proper Bot Framework registration enables:

- **Bidirectional messaging**: Respond to user questions in Teams with Toast data
- **Proactive messaging**: Send alerts to specific users or channels without webhooks
- **Threading**: Group related alerts into threads (e.g., all alerts for the same restaurant)
- **Rich interactions**: Cards with buttons, dropdowns, and forms
- **Authentication**: Azure AD SSO for seamless user identity

## What Needs to Be Built

### Short Term (v0.2)
1. Webhook HTTP listener with signature validation
2. Polling engine for menu and order monitoring
3. Event emission from both sources through the emitter
4. The Teams bridge will work automatically once events flow

### Medium Term (v0.3)
1. Adaptive Card templates for each event type
2. Bot Framework registration and message handling
3. Basic bidirectional queries ("What are today's orders?")
4. Thread management for related alerts

### Long Term
1. Work IQ signal publication
2. Copilot agent plugin manifest
3. Declarative agent for natural language Toast queries
4. Multi tenant support for partner integrations serving multiple restaurant groups
