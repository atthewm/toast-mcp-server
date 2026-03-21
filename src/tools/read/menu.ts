import { z } from "zod";
import type { ToolDefinition } from "../registry.js";
import { jsonResult } from "../registry.js";
import type { Menu, MenuMetadata } from "../../models/index.js";

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

    const menus = await client.get<Menu[]>(
      "/menus/v2/menus",
      undefined,
      guid
    );

    const metadata: MenuMetadata = {
      menuCount: Array.isArray(menus) ? menus.length : 0,
      menus: Array.isArray(menus)
        ? menus.map((m) => ({
            guid: m.guid,
            name: m.name,
            groupCount: m.groups?.length ?? 0,
          }))
        : [],
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

    const result = await client.get<Menu | Menu[]>(path, undefined, guid);

    return jsonResult(result);
  },
};
