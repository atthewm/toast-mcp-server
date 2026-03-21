import { z } from "zod";
import type { ToolDefinition } from "../registry.js";
import { jsonResult, textResult } from "../registry.js";
import type { RestaurantInfo } from "../../models/index.js";

export const listRestaurantsTool: ToolDefinition = {
  name: "toast_list_restaurants",
  description:
    "List configured restaurants. Returns basic info for each restaurant GUID " +
    "configured in the server. In partner mode, may discover restaurants via " +
    "the management group.",
  inputSchema: z.object({}),
  async execute(_input, { client }) {
    const guids = client.getRestaurantGuids();

    if (guids.length === 0) {
      return textResult(
        "No restaurant GUIDs configured. Set TOAST_RESTAURANT_GUID or " +
          "TOAST_RESTAURANT_GUIDS in your environment."
      );
    }

    const restaurants: Array<RestaurantInfo | { guid: string; error: string }> =
      [];

    for (const guid of guids) {
      try {
        const info = await client.get<RestaurantInfo>(
          `/restaurants/v1/restaurants/${guid}`,
          undefined,
          guid
        );
        restaurants.push(info);
      } catch (error) {
        restaurants.push({
          guid,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch restaurant info",
        });
      }
    }

    return jsonResult({
      count: restaurants.length,
      restaurants,
    });
  },
};
