import { z } from "zod";
import type { ToolDefinition } from "../registry.js";
import { jsonResult } from "../registry.js";
import type { Menu, MenuMetadata } from "../../models/index.js";

/**
 * Toast menus API returns { menus: [...] } not a flat array.
 */
interface MenusResponse {
  menus?: Menu[];
  // Flat array fallback
  [key: string]: unknown;
}

function extractMenus(data: unknown): Menu[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "menus" in data) {
    const resp = data as MenusResponse;
    if (Array.isArray(resp.menus)) return resp.menus;
  }
  return [];
}

/**
 * Menu groups may be nested under "groups" or "menuGroups".
 */
function getGroups(menu: Menu): Menu["groups"] {
  return menu.groups ?? (menu as unknown as Record<string, unknown>).menuGroups as Menu["groups"] ?? [];
}

export const menuMetadataTool: ToolDefinition = {
  name: "toast_get_menu_metadata",
  description:
    "Get a lightweight overview of available menus without full item details. " +
    "Returns menu names, GUIDs, and group counts. Use this before fetching " +
    "the full menu to understand what is available.",
  inputSchema: z.object({
    restaurantGuid: z
      .string()
      .optional()
      .describe("Restaurant GUID. Uses default if not provided."),
  }),
  async execute(input, { client }) {
    const guid = input.restaurantGuid ?? client.getDefaultRestaurantGuid();
    if (!guid) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No restaurant GUID provided and no default configured.",
          },
        ],
        isError: true,
      };
    }

    const raw = await client.get<unknown>(
      "/menus/v2/menus",
      undefined,
      guid
    );

    const menus = extractMenus(raw);

    const metadata: MenuMetadata = {
      menuCount: menus.length,
      menus: menus.map((m) => ({
        guid: m.guid,
        name: m.name,
        groupCount: getGroups(m).length,
      })),
    };

    return jsonResult(metadata);
  },
};

export const getMenuTool: ToolDefinition = {
  name: "toast_get_menu",
  description:
    "Get full menu details including groups, items, modifiers, and prices. " +
    "This can return a large payload. Consider using toast_get_menu_metadata " +
    "first to identify the specific menu you need.",
  inputSchema: z.object({
    restaurantGuid: z
      .string()
      .optional()
      .describe("Restaurant GUID. Uses default if not provided."),
    menuGuid: z
      .string()
      .optional()
      .describe(
        "Specific menu GUID to fetch. If omitted, returns all menus."
      ),
  }),
  async execute(input, { client }) {
    const guid = input.restaurantGuid ?? client.getDefaultRestaurantGuid();
    if (!guid) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No restaurant GUID provided and no default configured.",
          },
        ],
        isError: true,
      };
    }

    const path = input.menuGuid
      ? `/menus/v2/menus/${input.menuGuid}`
      : "/menus/v2/menus";

    const raw = await client.get<unknown>(path, undefined, guid);

    // Return extracted menus for the list endpoint, raw for single menu
    if (input.menuGuid) {
      return jsonResult(raw);
    }

    return jsonResult(extractMenus(raw));
  },
};

export { extractMenus, getGroups };
