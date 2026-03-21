import type { ToastEvent } from "../events/index.js";
import type { BridgeMessage } from "./types.js";

/**
 * Adaptive Card v1.5 builder for Teams notifications.
 *
 * Generates Adaptive Card payloads that support:
 * - Rich text and structured layouts
 * - Color coded severity indicators
 * - Fact sets for key/value data
 * - Action buttons (future: interactive responses)
 *
 * Reference: https://adaptivecards.io/explorer/
 */

interface AdaptiveCard {
  type: "AdaptiveCard";
  $schema: string;
  version: string;
  body: Array<Record<string, unknown>>;
  actions?: Array<Record<string, unknown>>;
  msteams?: Record<string, unknown>;
}

const SEVERITY_STYLES: Record<string, { color: string; icon: string }> = {
  info: { color: "accent", icon: "Info" },
  warning: { color: "warning", icon: "Warning" },
  critical: { color: "attention", icon: "Urgent" },
};

/**
 * Build an Adaptive Card payload from a bridge message.
 */
export function buildAdaptiveCard(message: BridgeMessage): AdaptiveCard {
  const style = SEVERITY_STYLES[message.severity] ?? SEVERITY_STYLES.info;

  const body: Array<Record<string, unknown>> = [
    // Header with severity indicator
    {
      type: "ColumnSet",
      columns: [
        {
          type: "Column",
          width: "auto",
          items: [
            {
              type: "Icon",
              name: style.icon,
              size: "small",
              color: style.color,
            },
          ],
          verticalContentAlignment: "Center",
        },
        {
          type: "Column",
          width: "stretch",
          items: [
            {
              type: "TextBlock",
              text: message.title,
              weight: "Bolder",
              size: "Medium",
              wrap: true,
              color: style.color,
            },
          ],
        },
      ],
    },

    // Body text
    {
      type: "TextBlock",
      text: message.body,
      wrap: true,
      spacing: "Medium",
    },
  ];

  // Add facts if present
  if (message.facts && message.facts.length > 0) {
    body.push({
      type: "FactSet",
      facts: message.facts.map((f) => ({
        title: f.name,
        value: f.value,
      })),
      spacing: "Medium",
    });
  }

  // Footer with event ID
  body.push({
    type: "TextBlock",
    text: `Event: ${message.sourceEventId}`,
    isSubtle: true,
    size: "Small",
    spacing: "Medium",
  });

  return {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    body,
    msteams: {
      width: "Full",
    },
  };
}

/**
 * Build a Teams webhook payload wrapping an Adaptive Card.
 * This is the format required by Power Automate workflow webhooks.
 */
export function buildTeamsWebhookPayload(
  message: BridgeMessage
): Record<string, unknown> {
  const card = buildAdaptiveCard(message);

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: card,
      },
    ],
  };
}

/**
 * Build a specialized Adaptive Card for menu change events.
 */
export function buildMenuChangeCard(
  event: ToastEvent
): AdaptiveCard {
  const payload = event.payload as Record<string, unknown>;
  const changedGuids = (payload.changedMenuGuids as string[]) ?? [];

  return {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    body: [
      {
        type: "ColumnSet",
        columns: [
          {
            type: "Column",
            width: "auto",
            items: [
              { type: "Icon", name: "Food", size: "small", color: "accent" },
            ],
            verticalContentAlignment: "Center",
          },
          {
            type: "Column",
            width: "stretch",
            items: [
              {
                type: "TextBlock",
                text: "Menu Updated",
                weight: "Bolder",
                size: "Medium",
              },
            ],
          },
        ],
      },
      {
        type: "TextBlock",
        text: event.summary,
        wrap: true,
      },
      {
        type: "FactSet",
        facts: [
          { title: "Restaurant", value: event.restaurantGuid },
          { title: "Menus Changed", value: String(changedGuids.length || "Unknown") },
          { title: "Time", value: event.timestamp },
        ],
      },
    ],
    msteams: { width: "Full" },
  };
}

/**
 * Build a specialized Adaptive Card for order threshold alerts.
 */
export function buildOrderThresholdCard(
  event: ToastEvent
): AdaptiveCard {
  const payload = event.payload as Record<string, unknown>;

  return {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    body: [
      {
        type: "ColumnSet",
        columns: [
          {
            type: "Column",
            width: "auto",
            items: [
              { type: "Icon", name: "Warning", size: "small", color: "warning" },
            ],
            verticalContentAlignment: "Center",
          },
          {
            type: "Column",
            width: "stretch",
            items: [
              {
                type: "TextBlock",
                text: "Order Volume Alert",
                weight: "Bolder",
                size: "Medium",
                color: "warning",
              },
            ],
          },
        ],
      },
      {
        type: "TextBlock",
        text: event.summary,
        wrap: true,
      },
      {
        type: "FactSet",
        facts: [
          { title: "Period", value: String(payload.period ?? "") },
          { title: "Count", value: String(payload.orderCount ?? "") },
          { title: "Threshold", value: String(payload.threshold ?? "") },
          { title: "Direction", value: String(payload.direction ?? "") },
        ],
      },
    ],
    msteams: { width: "Full" },
  };
}

/**
 * Build a specialized Adaptive Card for health check failures.
 */
export function buildHealthAlertCard(
  event: ToastEvent
): AdaptiveCard {
  return {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    body: [
      {
        type: "ColumnSet",
        columns: [
          {
            type: "Column",
            width: "auto",
            items: [
              { type: "Icon", name: "Urgent", size: "small", color: "attention" },
            ],
            verticalContentAlignment: "Center",
          },
          {
            type: "Column",
            width: "stretch",
            items: [
              {
                type: "TextBlock",
                text: "Health Check Alert",
                weight: "Bolder",
                size: "Medium",
                color: "attention",
              },
            ],
          },
        ],
      },
      {
        type: "TextBlock",
        text: event.summary,
        wrap: true,
      },
      {
        type: "FactSet",
        facts: [
          { title: "Restaurant", value: event.restaurantGuid },
          { title: "Severity", value: event.severity },
          { title: "Time", value: event.timestamp },
        ],
      },
    ],
    msteams: { width: "Full" },
  };
}
