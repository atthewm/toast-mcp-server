import { logger } from "../utils/index.js";
import type { ToastEvent } from "../events/index.js";
import type { NotificationBridge, BridgeMessage } from "./types.js";
import {
  buildTeamsWebhookPayload,
  buildMenuChangeCard,
  buildOrderThresholdCard,
  buildHealthAlertCard,
} from "./adaptive-cards.js";

/**
 * Microsoft Teams notification bridge.
 *
 * Sends Toast events to Teams channels via Power Automate workflow
 * webhooks using Adaptive Cards v1.5. This replaces the deprecated
 * Office 365 Connector / incoming webhook approach (sunset April 2026).
 *
 * Setup:
 * 1. In Teams, create a Power Automate workflow triggered by
 *    "When a Teams webhook request is received"
 * 2. Add "Post adaptive card in a chat or channel" as the action
 * 3. Copy the workflow URL to MICROSOFT_TEAMS_WEBHOOK_URL
 *
 * For specialized cards (menu changes, order alerts, health checks),
 * the bridge selects a purpose built Adaptive Card template.
 */
export class TeamsBridge implements NotificationBridge {
  readonly name = "microsoft-teams";

  constructor(
    private readonly webhookUrl: string | undefined,
    private readonly enabled: boolean
  ) {}

  isEnabled(): boolean {
    return this.enabled && !!this.webhookUrl;
  }

  formatMessage(event: ToastEvent): BridgeMessage {
    const facts: Array<{ name: string; value: string }> = [
      { name: "Event", value: event.type },
      { name: "Restaurant", value: event.restaurantGuid },
      { name: "Severity", value: event.severity },
      { name: "Time", value: event.timestamp },
    ];

    return {
      title: this.formatTitle(event),
      body: event.summary,
      severity: event.severity,
      facts,
      sourceEventId: event.id,
    };
  }

  async send(message: BridgeMessage): Promise<void> {
    if (!this.isEnabled()) {
      logger.debug("Teams bridge not enabled, skipping send");
      return;
    }

    const payload = buildTeamsWebhookPayload(message);

    try {
      const response = await fetch(this.webhookUrl!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        logger.error("Teams webhook delivery failed", {
          status: response.status,
          eventId: message.sourceEventId,
        });
      } else {
        logger.info("Teams notification sent", {
          eventId: message.sourceEventId,
        });
      }
    } catch (error) {
      logger.error("Teams webhook request failed", {
        error:
          error instanceof Error ? error.message : String(error),
        eventId: message.sourceEventId,
      });
    }
  }

  /**
   * Send a specialized card for specific event types.
   * Falls back to the generic Adaptive Card for unrecognized types.
   */
  async sendEvent(event: ToastEvent): Promise<void> {
    if (!this.isEnabled()) return;

    let payload: Record<string, unknown>;

    // Use specialized card templates for known event types
    switch (event.type) {
      case "menu.changed": {
        const card = buildMenuChangeCard(event);
        payload = {
          type: "message",
          attachments: [
            {
              contentType: "application/vnd.microsoft.card.adaptive",
              contentUrl: null,
              content: card,
            },
          ],
        };
        break;
      }
      case "order.threshold_alert": {
        const card = buildOrderThresholdCard(event);
        payload = {
          type: "message",
          attachments: [
            {
              contentType: "application/vnd.microsoft.card.adaptive",
              contentUrl: null,
              content: card,
            },
          ],
        };
        break;
      }
      case "health.check_failed":
      case "health.check_recovered": {
        const card = buildHealthAlertCard(event);
        payload = {
          type: "message",
          attachments: [
            {
              contentType: "application/vnd.microsoft.card.adaptive",
              contentUrl: null,
              content: card,
            },
          ],
        };
        break;
      }
      default: {
        const message = this.formatMessage(event);
        payload = buildTeamsWebhookPayload(message);
      }
    }

    try {
      const response = await fetch(this.webhookUrl!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        logger.error("Teams event delivery failed", {
          status: response.status,
          type: event.type,
          eventId: event.id,
        });
      } else {
        logger.info("Teams event notification sent", {
          type: event.type,
          eventId: event.id,
        });
      }
    } catch (error) {
      logger.error("Teams event delivery error", {
        error: error instanceof Error ? error.message : String(error),
        type: event.type,
        eventId: event.id,
      });
    }
  }

  private formatTitle(event: ToastEvent): string {
    const prefix =
      event.severity === "critical"
        ? "ALERT"
        : event.severity === "warning"
          ? "Warning"
          : "Info";

    const typeLabel = event.type.replace(/[._]/g, " ");

    return `[${prefix}] Toast: ${typeLabel}`;
  }
}
