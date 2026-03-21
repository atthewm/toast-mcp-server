import type { ToastEvent } from "../events/index.js";

/**
 * A notification message ready for delivery to an external system.
 */
export interface BridgeMessage {
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  /** Optional structured payload for rich message formatting */
  facts?: Array<{ name: string; value: string }>;
  /** Source event ID for traceability */
  sourceEventId: string;
}

/**
 * Interface for outbound notification adapters.
 * Implement this to add support for Teams, Slack, email, etc.
 */
export interface NotificationBridge {
  /** Unique name of this bridge */
  readonly name: string;

  /** Whether the bridge is configured and ready to send */
  isEnabled(): boolean;

  /** Transform a ToastEvent into a bridge message */
  formatMessage(event: ToastEvent): BridgeMessage;

  /** Send a message through this bridge */
  send(message: BridgeMessage): Promise<void>;
}
