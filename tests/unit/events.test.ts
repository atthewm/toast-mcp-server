import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "../../src/events/emitter.js";
import { createEvent, type ToastEvent, type EventType } from "../../src/events/types.js";

describe("EventEmitter", () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Build a test event with the given type and optional overrides.
   */
  function makeEvent(
    type: EventType = "order.created",
    overrides: Partial<ToastEvent> = {}
  ): ToastEvent {
    return {
      id: "test-event-001",
      type,
      severity: "info",
      timestamp: "2026-03-21T12:00:00.000Z",
      restaurantGuid: "c227349d-7778-4ec2-af27-e386eb2ec52e",
      summary: `Test event of type ${type}`,
      payload: {},
      source: "internal",
      ...overrides,
    };
  }

  describe("event handler registration", () => {
    it("should register a handler for a specific event type", () => {
      const handler = vi.fn();

      emitter.on("order.created", handler);

      expect(emitter.handlerCount("order.created")).toBe(1);
    });

    it("should register multiple handlers for the same event type", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on("order.created", handler1);
      emitter.on("order.created", handler2);

      expect(emitter.handlerCount("order.created")).toBe(2);
    });

    it("should register handlers for different event types independently", () => {
      emitter.on("order.created", vi.fn());
      emitter.on("menu.changed", vi.fn());
      emitter.on("menu.changed", vi.fn());

      expect(emitter.handlerCount("order.created")).toBe(1);
      expect(emitter.handlerCount("menu.changed")).toBe(2);
    });

    it("should remove a handler with off()", () => {
      const handler = vi.fn();

      emitter.on("order.created", handler);
      expect(emitter.handlerCount("order.created")).toBe(1);

      emitter.off("order.created", handler);
      expect(emitter.handlerCount("order.created")).toBe(0);
    });

    it("should only remove the exact handler reference on off()", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on("order.created", handler1);
      emitter.on("order.created", handler2);

      emitter.off("order.created", handler1);

      expect(emitter.handlerCount("order.created")).toBe(1);
    });

    it("should report total handler count when no type is specified", () => {
      emitter.on("order.created", vi.fn());
      emitter.on("menu.changed", vi.fn());
      emitter.on("*", vi.fn());

      expect(emitter.handlerCount()).toBe(3);
    });
  });

  describe("event emission to matching handlers", () => {
    it("should call the handler when an event of the matching type is emitted", async () => {
      const handler = vi.fn();
      emitter.on("order.created", handler);

      const event = makeEvent("order.created");
      await emitter.emit(event);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(event);
    });

    it("should call all matching handlers in order", async () => {
      const callOrder: number[] = [];
      const handler1 = vi.fn(() => callOrder.push(1));
      const handler2 = vi.fn(() => callOrder.push(2));
      const handler3 = vi.fn(() => callOrder.push(3));

      emitter.on("menu.changed", handler1);
      emitter.on("menu.changed", handler2);
      emitter.on("menu.changed", handler3);

      await emitter.emit(makeEvent("menu.changed"));

      expect(callOrder).toEqual([1, 2, 3]);
    });

    it("should not call handlers for non matching event types", async () => {
      const orderHandler = vi.fn();
      const menuHandler = vi.fn();

      emitter.on("order.created", orderHandler);
      emitter.on("menu.changed", menuHandler);

      await emitter.emit(makeEvent("order.created"));

      expect(orderHandler).toHaveBeenCalledOnce();
      expect(menuHandler).not.toHaveBeenCalled();
    });

    it("should handle events with no registered handlers without errors", async () => {
      const event = makeEvent("health.check_failed");

      // Should not throw even though no handlers are registered
      await expect(emitter.emit(event)).resolves.toBeUndefined();
    });
  });

  describe("wildcard handlers", () => {
    it("should call wildcard handlers on every event", async () => {
      const wildcardHandler = vi.fn();
      emitter.on("*", wildcardHandler);

      await emitter.emit(makeEvent("order.created"));
      await emitter.emit(makeEvent("menu.changed"));
      await emitter.emit(makeEvent("health.check_recovered"));

      expect(wildcardHandler).toHaveBeenCalledTimes(3);
    });

    it("should call both specific and wildcard handlers", async () => {
      const specificHandler = vi.fn();
      const wildcardHandler = vi.fn();

      emitter.on("order.created", specificHandler);
      emitter.on("*", wildcardHandler);

      const event = makeEvent("order.created");
      await emitter.emit(event);

      expect(specificHandler).toHaveBeenCalledOnce();
      expect(wildcardHandler).toHaveBeenCalledOnce();
      expect(specificHandler).toHaveBeenCalledWith(event);
      expect(wildcardHandler).toHaveBeenCalledWith(event);
    });

    it("should call specific handlers before wildcard handlers", async () => {
      const callOrder: string[] = [];

      emitter.on("order.created", () => callOrder.push("specific"));
      emitter.on("*", () => callOrder.push("wildcard"));

      await emitter.emit(makeEvent("order.created"));

      expect(callOrder).toEqual(["specific", "wildcard"]);
    });
  });

  describe("error in handler does not break other handlers", () => {
    it("should continue calling remaining handlers after one throws", async () => {
      const handler1 = vi.fn();
      const failingHandler = vi.fn(() => {
        throw new Error("Handler exploded");
      });
      const handler3 = vi.fn();

      emitter.on("order.created", handler1);
      emitter.on("order.created", failingHandler);
      emitter.on("order.created", handler3);

      // Should not throw
      await emitter.emit(makeEvent("order.created"));

      expect(handler1).toHaveBeenCalledOnce();
      expect(failingHandler).toHaveBeenCalledOnce();
      expect(handler3).toHaveBeenCalledOnce();
    });

    it("should continue calling wildcard handlers even if a specific handler throws", async () => {
      const wildcardHandler = vi.fn();
      const failingHandler = vi.fn(() => {
        throw new Error("Specific handler failed");
      });

      emitter.on("order.created", failingHandler);
      emitter.on("*", wildcardHandler);

      await emitter.emit(makeEvent("order.created"));

      expect(failingHandler).toHaveBeenCalledOnce();
      expect(wildcardHandler).toHaveBeenCalledOnce();
    });

    it("should handle async handler rejection gracefully", async () => {
      const asyncFailHandler = vi.fn(async () => {
        throw new Error("Async failure");
      });
      const afterHandler = vi.fn();

      emitter.on("menu.changed", asyncFailHandler);
      emitter.on("menu.changed", afterHandler);

      await emitter.emit(makeEvent("menu.changed"));

      expect(asyncFailHandler).toHaveBeenCalledOnce();
      expect(afterHandler).toHaveBeenCalledOnce();
    });
  });
});

describe("createEvent", () => {
  it("should generate a unique ID for the event", () => {
    const event = createEvent({
      type: "order.created",
      severity: "info",
      restaurantGuid: "test-guid",
      summary: "New order received",
      payload: { orderGuid: "ord-123" },
      source: "webhook",
    });

    expect(event.id).toBeDefined();
    expect(event.id.length).toBeGreaterThan(0);
    // UUID format: 8-4-4-4-12 hex characters
    expect(event.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("should generate a timestamp in ISO 8601 format", () => {
    const event = createEvent({
      type: "menu.changed",
      severity: "warning",
      restaurantGuid: "test-guid",
      summary: "Menu updated",
      payload: {},
      source: "poll",
    });

    expect(event.timestamp).toBeDefined();
    // Verify it parses as a valid date
    const parsed = new Date(event.timestamp);
    expect(parsed.toISOString()).toBe(event.timestamp);
  });

  it("should preserve all provided fields in the output", () => {
    const event = createEvent({
      type: "order.threshold_alert",
      severity: "critical",
      restaurantGuid: "guid-abc",
      summary: "Order volume exceeds threshold",
      payload: { orderCount: 100, threshold: 50, direction: "above" as const, period: "1h" },
      source: "internal",
      metadata: { evaluatedAt: "2026-03-21T12:00:00Z" },
    });

    expect(event.type).toBe("order.threshold_alert");
    expect(event.severity).toBe("critical");
    expect(event.restaurantGuid).toBe("guid-abc");
    expect(event.summary).toContain("threshold");
    expect(event.payload).toEqual({
      orderCount: 100,
      threshold: 50,
      direction: "above",
      period: "1h",
    });
    expect(event.source).toBe("internal");
    expect(event.metadata?.evaluatedAt).toBe("2026-03-21T12:00:00Z");
  });

  it("should generate different IDs for two separate events", () => {
    const event1 = createEvent({
      type: "order.created",
      severity: "info",
      restaurantGuid: "guid-1",
      summary: "Event 1",
      payload: {},
      source: "internal",
    });

    const event2 = createEvent({
      type: "order.created",
      severity: "info",
      restaurantGuid: "guid-1",
      summary: "Event 2",
      payload: {},
      source: "internal",
    });

    expect(event1.id).not.toBe(event2.id);
  });
});
