import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { searchMenuItemsTool } from "../../src/tools/read/search-menu.js";
import type { ToolContext, ToolResult } from "../../src/tools/registry.js";
import type { ToastClient } from "../../src/toast/client.js";
import {
  createMockConfig,
  mockMenus,
  mockMenu,
} from "../fixtures/api-responses.js";

/**
 * Build a mock ToolContext with a mocked client.get that returns the given menus.
 */
function makeMenuContext(
  menus: unknown = mockMenus,
  configOverrides: Record<string, unknown> = {}
): { context: ToolContext; getSpy: ReturnType<typeof vi.fn> } {
  const getSpy = vi.fn().mockResolvedValue(menus);

  const client = {
    get: getSpy,
    getDefaultRestaurantGuid: vi
      .fn()
      .mockReturnValue("c227349d-7778-4ec2-af27-e386eb2ec52e"),
    getRestaurantGuids: vi
      .fn()
      .mockReturnValue(["c227349d-7778-4ec2-af27-e386eb2ec52e"]),
  } as unknown as ToastClient;

  const config = createMockConfig(configOverrides);

  return { context: { client, config }, getSpy };
}

/**
 * Execute the search tool with the given input and return the parsed result.
 */
async function executeSearch(
  input: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  // Validate input through the tool's inputSchema
  const parsed = searchMenuItemsTool.inputSchema.parse(input);
  return searchMenuItemsTool.execute(parsed, context);
}

/**
 * Parse the JSON from a successful tool result.
 */
function parseJsonResult(result: ToolResult): Record<string, unknown> {
  return JSON.parse(result.content[0].text);
}

describe("searchMenuItemsTool", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("search by item name", () => {
    it("should find an item by its exact name", async () => {
      const { context } = makeMenuContext();

      const result = await executeSearch({ query: "House Latte" }, context);

      expect(result.isError).toBeUndefined();
      const data = parseJsonResult(result);
      expect(data.resultCount).toBeGreaterThanOrEqual(1);
      const results = data.results as Array<Record<string, unknown>>;
      const latteResult = results.find(
        (r) => (r.item as Record<string, unknown>).name === "House Latte"
      );
      expect(latteResult).toBeDefined();
      expect(latteResult?.matchField).toBe("name");
    });

    it("should find an item by a partial name match", async () => {
      const { context } = makeMenuContext();

      const result = await executeSearch({ query: "Latte" }, context);

      expect(result.isError).toBeUndefined();
      const data = parseJsonResult(result);
      expect(data.resultCount).toBeGreaterThanOrEqual(1);
    });

    it("should match items by description", async () => {
      const { context } = makeMenuContext();

      const result = await executeSearch({ query: "espresso" }, context);

      expect(result.isError).toBeUndefined();
      const data = parseJsonResult(result);
      expect(data.resultCount).toBeGreaterThanOrEqual(1);
      const results = data.results as Array<Record<string, unknown>>;
      const descMatch = results.find((r) => r.matchField === "description");
      expect(descMatch).toBeDefined();
    });
  });

  describe("search by group name", () => {
    it("should return items from a matching group", async () => {
      const { context } = makeMenuContext();

      const result = await executeSearch({ query: "Pastries" }, context);

      expect(result.isError).toBeUndefined();
      const data = parseJsonResult(result);
      expect(data.resultCount).toBeGreaterThanOrEqual(1);
      const results = data.results as Array<Record<string, unknown>>;
      const groupMatch = results.find((r) => r.matchField === "group");
      expect(groupMatch).toBeDefined();
      expect(groupMatch?.groupName).toBe("Pastries");
    });
  });

  describe("search by modifier name", () => {
    it("should find items that have a matching modifier", async () => {
      const { context } = makeMenuContext();

      const result = await executeSearch({ query: "Oat Milk" }, context);

      expect(result.isError).toBeUndefined();
      const data = parseJsonResult(result);
      expect(data.resultCount).toBeGreaterThanOrEqual(1);
      const results = data.results as Array<Record<string, unknown>>;
      const modMatch = results.find((r) =>
        (r.matchField as string).startsWith("modifier:")
      );
      expect(modMatch).toBeDefined();
      expect((modMatch?.matchField as string)).toContain("Oat Milk");
    });
  });

  describe("case insensitive matching", () => {
    it("should find items regardless of case in the query", async () => {
      const { context } = makeMenuContext();

      const lower = await executeSearch({ query: "house latte" }, context);
      const upper = await executeSearch({ query: "HOUSE LATTE" }, context);
      const mixed = await executeSearch({ query: "hOuSe LaTtE" }, context);

      const lowerData = parseJsonResult(lower);
      const upperData = parseJsonResult(upper);
      const mixedData = parseJsonResult(mixed);

      expect(lowerData.resultCount).toBeGreaterThanOrEqual(1);
      expect(upperData.resultCount).toEqual(lowerData.resultCount);
      expect(mixedData.resultCount).toEqual(lowerData.resultCount);
    });

    it("should match group names case insensitively", async () => {
      const { context } = makeMenuContext();

      const result = await executeSearch({ query: "pastries" }, context);

      expect(result.isError).toBeUndefined();
      const data = parseJsonResult(result);
      expect(data.resultCount).toBeGreaterThanOrEqual(1);
    });

    it("should match modifier names case insensitively", async () => {
      const { context } = makeMenuContext();

      const result = await executeSearch({ query: "oat milk" }, context);

      expect(result.isError).toBeUndefined();
      const data = parseJsonResult(result);
      expect(data.resultCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("max results limit", () => {
    it("should respect the maxResults parameter", async () => {
      const { context } = makeMenuContext();

      const result = await executeSearch(
        { query: "c", maxResults: 2 },
        context
      );

      expect(result.isError).toBeUndefined();
      const data = parseJsonResult(result);
      expect(data.resultCount).toBeLessThanOrEqual(2);
    });

    it("should default maxResults to 20", async () => {
      // Create a menu with many items to verify the default cap
      const manyItemsMenu = {
        guid: "big-menu",
        name: "Big Menu",
        groups: [
          {
            guid: "big-group",
            name: "Lots of Items",
            items: Array.from({ length: 30 }, (_, i) => ({
              guid: `item-${i}`,
              name: `Test Item ${i}`,
              description: `Description for item ${i}`,
              price: 1.0,
            })),
          },
        ],
      };

      const { context } = makeMenuContext([manyItemsMenu]);

      const result = await executeSearch({ query: "Test Item" }, context);

      expect(result.isError).toBeUndefined();
      const data = parseJsonResult(result);
      expect(data.resultCount).toBeLessThanOrEqual(20);
    });

    it("should return fewer than maxResults when there are not enough matches", async () => {
      const { context } = makeMenuContext();

      const result = await executeSearch(
        { query: "House Latte", maxResults: 50 },
        context
      );

      expect(result.isError).toBeUndefined();
      const data = parseJsonResult(result);
      expect(data.resultCount).toBeLessThan(50);
    });
  });

  describe("no results found", () => {
    it("should return a text message when no items match", async () => {
      const { context } = makeMenuContext();

      const result = await executeSearch(
        { query: "zzzznonexistentzzz" },
        context
      );

      expect(result.content[0].text).toContain("No menu items found");
      expect(result.content[0].text).toContain("zzzznonexistentzzz");
    });

    it("should return a message when the restaurant has no menus", async () => {
      const { context } = makeMenuContext([]);

      const result = await executeSearch({ query: "anything" }, context);

      expect(result.content[0].text).toContain("No menus found");
    });
  });

  describe("subgroup searching", () => {
    it("should find items nested inside subgroups", async () => {
      const { context } = makeMenuContext();

      const result = await executeSearch(
        { query: "Pumpkin Spice" },
        context
      );

      expect(result.isError).toBeUndefined();
      const data = parseJsonResult(result);
      expect(data.resultCount).toBeGreaterThanOrEqual(1);
      const results = data.results as Array<Record<string, unknown>>;
      const pumpkin = results.find(
        (r) =>
          (r.item as Record<string, unknown>).name === "Pumpkin Spice Muffin"
      );
      expect(pumpkin).toBeDefined();
    });
  });

  describe("missing restaurant GUID", () => {
    it("should return an error when no GUID is available", async () => {
      const getSpy = vi.fn();
      const client = {
        get: getSpy,
        getDefaultRestaurantGuid: vi.fn().mockReturnValue(undefined),
      } as unknown as ToastClient;

      const context: ToolContext = {
        client,
        config: createMockConfig({ toastRestaurantGuid: undefined }),
      };

      const result = await executeSearch({ query: "test" }, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("No restaurant GUID");
    });
  });

  describe("restaurant GUID override", () => {
    it("should use the provided restaurant GUID over the default", async () => {
      const { context, getSpy } = makeMenuContext();

      await executeSearch(
        { query: "Latte", restaurantGuid: "custom-guid" },
        context
      );

      expect(getSpy).toHaveBeenCalledWith(
        "/menus/v2/menus",
        undefined,
        "custom-guid"
      );
    });
  });
});
