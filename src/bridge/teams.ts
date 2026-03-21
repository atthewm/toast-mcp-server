import { logger } from "../utils/index.js";
import type { ToastEvent } from "../events/index.js";
import type { NotificationBridge, BridgeMessage } from "./types.js";

const SEVERITY_COLORS: Record<string, string> = {
  info: "0076D7",
  warning: "FFA500",
  critical: "FF0000",
};

/**
 * Microsoft Teams notification bridge using incoming webhooks.
 *
 * This is a foundation for future Teams integration. It transforms
 * Toast events into Teams webhook card payloads and delivers them.
 *
 * TODO: Support Adaptive Cards format for richer interactivity
 * TODO: Support Teams Bot Framework for bidirectional communication
 * TODO: Support Power Automate / Work IQ triggers
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

    const card = this.buildTeamsCard(message);

    try {
      const response = await fetch(this.webhookUrl!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
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
   * Build a MessageCard payload for Teams incoming webhook.
   * Uses the legacy MessageCard format for broad compatibility.
   */
  private buildTeamsCard(
    message: BridgeMessage
  ): Record<string, unknown> {
    return {
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      themeColor: SEVERITY_COLORS[message.severity] ?? "0076D7",
      summary: message.title,
      sections: [
        {
          activityTitle: message.title,
          activitySubtitle: `Event: ${message.sourceEventId}`,
          text: message.body,
          facts: message.facts ?? [],
          markdown: true,
        },
      ],
    };
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
