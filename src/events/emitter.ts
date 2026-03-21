import { logger } from "../utils/index.js";
import type { ToastEvent, EventType } from "./types.js";

type EventHandler = (event: ToastEvent) => void | Promise<void>;

/**
 * Simple typed event emitter for internal event routing.
 * Consumers (like the Teams bridge) register handlers here.
 */
export class EventEmitter {
  private handlers: Map<EventType | "*", EventHandler[]> = new Map();

  /**
   * Register a handler for a specific event type.
   * Use "*" to handle all events.
   */
  on(type: EventType | "*", handler: EventHandler): void {
    const existing = this.handlers.get(type) ?? [];
    existing.push(handler);
    this.handlers.set(type, existing);
  }

  /**
   * Remove a handler for a specific event type.
   */
  off(type: EventType | "*", handler: EventHandler): void {
    const existing = this.handlers.get(type) ?? [];
    this.handlers.set(
      type,
      existing.filter((h) => h !== handler)
    );
  }

  /**
   * Emit an event. Calls all matching handlers and wildcard handlers.
   * Errors in handlers are logged but do not propagate.
   */
  async emit(event: ToastEvent): Promise<void> {
    const handlers = [
      ...(this.handlers.get(event.type) ?? []),
      ...(this.handlers.get("*") ?? []),
    ];

    logger.debug("Emitting event", {
      type: event.type,
      id: event.id,
      handlerCount: handlers.length,
    });

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        logger.error("Event handler error", {
          type: event.type,
          eventId: event.id,
          error:
            error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Get the number of registered handlers.
   */
  handlerCount(type?: EventType | "*"): number {
    if (type) {
      return (this.handlers.get(type) ?? []).length;
    }
    let count = 0;
    for (const handlers of this.handlers.values()) {
      count += handlers.length;
    }
    return count;
  }
}
