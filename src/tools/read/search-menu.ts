import { z } from "zod";
import type { ToolDefinition } from "../registry.js";
import { jsonResult, textResult } from "../registry.js";
import type { Menu, MenuSearchResult } from "../../models/index.js";

/**
 * Search through menus client-side since Toast does not provide
 * a server-side menu search endpoint.
 */
export const searchMenuItemsTool: ToolDefinition = {
  name: "toast_search_menu_items",
  description:
    "Search menu items by name, group, modifier, or keyword. " +
    "Searches across all menus and returns matching items with their " +
    "menu and group context. Case insensitive.",
  inputSchema: z.object({
    query: z.string().describe("Search term to match against item names, groups, and modifiers."),
    restaurantGuid: z
      .string()
      .optional()
      .describe("Restaurant GUID. Uses default if not provided."),
    maxResults: z
      .number()
      .optional()
      .default(20)
      .describe("Maximum number of results to return. Default: 20."),
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

    const menus = await client.get<Menu[]>("/menus/v2/menus", undefined, guid);

    if (!Array.isArray(menus) || menus.length === 0) {
      return textResult("No menus found for this restaurant.");
    }

    const query = input.query.toLowerCase();
    const results: MenuSearchResult[] = [];
    const maxResults = input.maxResults ?? 20;

    for (const menu of menus) {
      if (results.length >= maxResults) break;
      searchGroups(menu.groups ?? [], menu.name, query, results, maxResults);
    }

    if (results.length === 0) {
      return textResult(`No menu items found matching "${input.query}".`);
    }

    return jsonResult({
      query: input.query,
      resultCount: results.length,
      results,
    });
  },
};

function searchGroups(
  groups: Menu["groups"],
  menuName: string,
  query: string,
  results: MenuSearchResult[],
  maxResults: number
): void {
  for (const group of groups) {
    if (results.length >= maxResults) return;

    // Search items in this group
    for (const item of group.items ?? []) {
      if (results.length >= maxResults) return;

      // Match on item name
      if (item.name?.toLowerCase().includes(query)) {
        results.push({
          item,
          menuName,
          groupName: group.name,
          matchField: "name",
        });
        continue;
      }

      // Match on item description
      if (item.description?.toLowerCase().includes(query)) {
        results.push({
          item,
          menuName,
          groupName: group.name,
          matchField: "description",
        });
        continue;
      }

      // Match on group name
      if (group.name?.toLowerCase().includes(query)) {
        results.push({
          item,
          menuName,
          groupName: group.name,
          matchField: "group",
        });
        continue;
      }

      // Match on modifier names
      const matchingMod = item.modifierGroups
        ?.flatMap((mg) => mg.modifiers ?? [])
        .find((mod) => mod.name?.toLowerCase().includes(query));

      if (matchingMod) {
        results.push({
          item,
          menuName,
          groupName: group.name,
          matchField: `modifier:${matchingMod.name}`,
        });
      }
    }

    // Recurse into subgroups
    if (group.subgroups) {
      searchGroups(group.subgroups, menuName, query, results, maxResults);
    }
  }
}
