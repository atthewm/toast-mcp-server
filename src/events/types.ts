/**
 * Normalized event types for the Toast MCP server.
 *
 * These represent internal events that can be produced by webhook ingestion,
 * polling, or internal triggers. They follow a consistent envelope format
 * that downstream consumers (Teams bridge, alerts, etc.) can rely on.
 */

export type EventType =
  | "restaurant.connected"
  | "restaurant.disconnected"
  | "menu.changed"
  | "order.created"
  | "order.status_changed"
  | "order.threshold_alert"
  | "item.availability_changed"
  | "service.disruption"
  | "health.check_failed"
  | "health.check_recovered";

export type EventSeverity = "info" | "warning" | "critical";

/**
 * Standard event envelope. All events flowing through the system
 * conform to this shape.
 */
export interface ToastEvent<T = unknown> {
  /** Unique event ID */
  id: string;
  /** Event type identifier */
  type: EventType;
  /** Severity level for routing and alerting */
  severity: EventSeverity;
  /** ISO 8601 timestamp of when the event occurred */
  timestamp: string;
  /** Restaurant GUID this event relates to */
  restaurantGuid: string;
  /** Human-readable summary of the event */
  summary: string;
  /** Typed event payload */
  payload: T;
  /** Source of the event (webhook, poll, internal) */
  source: "webhook" | "poll" | "internal";
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

// Payload types for specific events

export interface MenuChangedPayload {
  previousMenuCount?: number;
  currentMenuCount?: number;
  changedMenuGuids?: string[];
}

export interface OrderThresholdPayload {
  period: string;
  orderCount: number;
  threshold: number;
  direction: "above" | "below";
}

export interface OrderStatusChangedPayload {
  orderGuid: string;
  previousStatus?: string;
  currentStatus: string;
}

export interface ItemAvailabilityPayload {
  itemGuid: string;
  itemName: string;
  available: boolean;
}

export interface ServiceDisruptionPayload {
  service: string;
  message: string;
  detectedAt: string;
}

/**
 * Create a new event with a generated ID and current timestamp.
 */
export function createEvent<T>(
  params: Omit<ToastEvent<T>, "id" | "timestamp">
): ToastEvent<T> {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...params,
  };
}
