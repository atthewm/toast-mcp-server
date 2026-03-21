# Teams Bridge Configuration (Future)

This example shows how the Teams bridge will be configured once event
ingestion is implemented.

## Environment Variables

```
MICROSOFT_TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/your-webhook-url
MICROSOFT_BRIDGE_ENABLED=true
```

## How It Works

1. Toast events are normalized into the standard event envelope format
2. The Teams bridge transforms each event into a MessageCard payload
3. Cards are delivered to your Teams channel via the incoming webhook

## Event to Message Examples

### Menu Change Notification

When a menu is updated, the Teams channel receives a card:

```
Title: [Info] Toast: menu changed
Body: Menu updated: 2 menus changed
Facts:
  Event: menu.changed
  Restaurant: c227349d-...
  Severity: info
  Time: 2026-03-21T14:30:00.000Z
```

### Order Volume Alert

When order volume crosses a threshold:

```
Title: [Warning] Toast: order threshold alert
Body: Order volume above threshold: 150 orders in last hour
Facts:
  Event: order.threshold_alert
  Restaurant: c227349d-...
  Severity: warning
  Time: 2026-03-21T12:00:00.000Z
```

## Future Enhancements

- Adaptive Cards for richer formatting and interactivity
- Bot Framework for bidirectional communication
- Power Automate triggers for workflow integration
- Copilot agent plugins for conversational Toast queries
