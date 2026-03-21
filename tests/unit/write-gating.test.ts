import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createOrderTool } from "../../src/tools/write/create-order.js";
import { updateOrderTool } from "../../src/tools/write/update-order.js";
import { priceOrderTool } from "../../src/tools/write/price-order.js";
import { ToolRegistry } from "../../src/tools/registry.js";
import type { ToolContext } from "../../src/tools/registry.js";
import type { ToastClient } from "../../src/toast/client.js";
import { WriteNotAllowedError } from "../../src/utils/errors.js";
import { createMockConfig } from "../fixtures/api-responses.js";

/**
 * Build a mock ToolContext.
 */
function makeContext(configOverrides: Record<string, unknown> = {}): ToolContext {
  const config = createMockConfig(configOverrides);

  const client = {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({ guid: "new-order-001" }),
    patch: vi.fn().mockResolvedValue({ guid: "updated-order-001" }),
    getDefaultRestaurantGuid: vi
      .fn()
      .mockReturnValue("c227349d-7778-4ec2-af27-e386eb2ec52e"),
    getRestaurantGuids: vi
      .fn()
      .mockReturnValue(["c227349d-7778-4ec2-af27-e386eb2ec52e"]),
  } as unknown as ToastClient;

  return { client, config };
}

const validSelections = [
  {
    itemGuid: "item-latte",
    quantity: 1,
  },
];

describe("write tool safety: confirm_write gate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createOrderTool requires confirm_write=true", () => {
    it("should refuse when confirm_write is false", async () => {
      const context = makeContext({ allowWrites: true, dryRun: false });

      const input = createOrderTool.inputSchema.parse({
        confirm_write: false,
        diningOptionGuid: "dine-opt-001",
        selections: validSelections,
      });

      const result = await createOrderTool.execute(input, context);

      expect(result.content[0].text).toContain("confirm_write=true");
    });

    it("should proceed when confirm_write is true and dryRun is false", async () => {
      const context = makeContext({ allowWrites: true, dryRun: false });

      const input = createOrderTool.inputSchema.parse({
        confirm_write: true,
        diningOptionGuid: "dine-opt-001",
        selections: validSelections,
      });

      const result = await createOrderTool.execute(input, context);

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.warning).toBeDefined();
      expect((context.client.post as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    });
  });

  describe("updateOrderTool requires confirm_write=true", () => {
    it("should refuse when confirm_write is false", async () => {
      const context = makeContext({ allowWrites: true, dryRun: false });

      const input = updateOrderTool.inputSchema.parse({
        confirm_write: false,
        orderGuid: "order-001",
      });

      const result = await updateOrderTool.execute(input, context);

      expect(result.content[0].text).toContain("confirm_write=true");
    });

    it("should proceed when confirm_write is true and dryRun is false", async () => {
      const context = makeContext({ allowWrites: true, dryRun: false });

      (context.client.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        guid: "order-001",
        checks: [{ selections: [] }],
      });

      const input = updateOrderTool.inputSchema.parse({
        confirm_write: true,
        orderGuid: "order-001",
        addSelections: validSelections,
      });

      const result = await updateOrderTool.execute(input, context);

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.warning).toBeDefined();
    });
  });
});

describe("write tool safety: DRY_RUN prevention", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should block createOrder execution when DRY_RUN is true", async () => {
    const context = makeContext({ allowWrites: true, dryRun: true });

    const input = createOrderTool.inputSchema.parse({
      confirm_write: true,
      diningOptionGuid: "dine-opt-001",
      selections: validSelections,
    });

    const result = await createOrderTool.execute(input, context);

    expect(result.content[0].text).toContain("DRY_RUN");
    expect(result.content[0].text).toContain("not actually submitted");
    // Verify the client was never called for the actual order
    expect(
      (context.client.post as ReturnType<typeof vi.fn>)
    ).not.toHaveBeenCalled();
  });

  it("should block updateOrder execution when DRY_RUN is true", async () => {
    const context = makeContext({ allowWrites: true, dryRun: true });

    const input = updateOrderTool.inputSchema.parse({
      confirm_write: true,
      orderGuid: "order-001",
    });

    const result = await updateOrderTool.execute(input, context);

    expect(result.content[0].text).toContain("DRY_RUN");
    expect(result.content[0].text).toContain("not actually");
    expect(
      (context.client.patch as ReturnType<typeof vi.fn>)
    ).not.toHaveBeenCalled();
  });

  it("should include the selection details in the dry run response", async () => {
    const context = makeContext({ allowWrites: true, dryRun: true });

    const input = createOrderTool.inputSchema.parse({
      confirm_write: true,
      diningOptionGuid: "dine-opt-001",
      selections: [
        { itemGuid: "item-latte", quantity: 2 },
        { itemGuid: "item-muffin", quantity: 1 },
      ],
    });

    const result = await createOrderTool.execute(input, context);

    expect(result.content[0].text).toContain("item-latte");
    expect(result.content[0].text).toContain("item-muffin");
  });
});

describe("write tool safety: ALLOW_WRITES=false prevention", () => {
  it("should not register write tools when allowWrites is false", () => {
    const registry = new ToolRegistry(createMockConfig({ allowWrites: false }));

    registry.register(createOrderTool);
    registry.register(updateOrderTool);
    registry.register(priceOrderTool);

    expect(registry.hasTool("toast_create_order")).toBe(false);
    expect(registry.hasTool("toast_update_order")).toBe(false);
    expect(registry.hasTool("toast_price_order")).toBe(false);
    expect(registry.size).toBe(0);
  });

  it("should register all write tools when allowWrites is true", () => {
    const registry = new ToolRegistry(createMockConfig({ allowWrites: true }));

    registry.register(createOrderTool);
    registry.register(updateOrderTool);
    registry.register(priceOrderTool);

    expect(registry.hasTool("toast_create_order")).toBe(true);
    expect(registry.hasTool("toast_update_order")).toBe(true);
    expect(registry.hasTool("toast_price_order")).toBe(true);
    expect(registry.size).toBe(3);
  });

  it("should throw WriteNotAllowedError when confirm_write is true but allowWrites is false in config (direct execute)", async () => {
    // This tests the secondary safety check inside the tool's execute function
    // (the tool was somehow called directly, bypassing registry gating)
    const context = makeContext({ allowWrites: false, dryRun: false });

    const input = createOrderTool.inputSchema.parse({
      confirm_write: true,
      diningOptionGuid: "dine-opt-001",
      selections: validSelections,
    });

    await expect(
      createOrderTool.execute(input, context)
    ).rejects.toThrow(WriteNotAllowedError);
  });
});

describe("priceOrderTool (write gated but non-destructive)", () => {
  it("should be marked as requiresWrite", () => {
    expect(priceOrderTool.requiresWrite).toBe(true);
  });

  it("should execute successfully and return pricing data", async () => {
    const context = makeContext({ allowWrites: true, dryRun: false });

    (context.client.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      subtotal: 5.5,
      tax: 0.45,
      total: 5.95,
    });

    const input = priceOrderTool.inputSchema.parse({
      selections: validSelections,
    });

    const result = await priceOrderTool.execute(input, context);

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.note).toContain("price estimate");
    expect(data.pricing.total).toBe(5.95);
  });
});
