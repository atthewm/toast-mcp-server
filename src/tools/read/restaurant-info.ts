import { z } from "zod";
import type { ToolDefinition } from "../registry.js";
import { jsonResult } from "../registry.js";
import type { RestaurantInfo } from "../../models/index.js";

export const restaurantInfoTool: ToolDefinition = {
  name: "toast_get_restaurant_info",
  description:
    "Get detailed information about a specific restaurant including " +
    "name, address, timezone, and currency.",
  inputSchema: z.object({
    restaurantGuid: z
      .string()
      .optional()
      .describe(
        "Restaurant GUID. Uses default if not provided."
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

    const info = await client.get<RestaurantInfo>(
      `/restaurants/v1/restaurants/${guid}`,
      undefined,
      guid
    );

    return jsonResult(info);
  },
};
