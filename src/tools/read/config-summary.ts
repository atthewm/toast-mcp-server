import { z } from "zod";
import type { ToolDefinition } from "../registry.js";
import { jsonResult } from "../registry.js";
import type {
  RestaurantInfo,
  RevenueCenter,
  DiningOption,
  ServiceArea,
} from "../../models/index.js";

export const configSummaryTool: ToolDefinition = {
  name: "toast_get_config_summary",
  description:
    "Get a summary of restaurant configuration including revenue centers, " +
    "dining options, and service areas. Useful for understanding how a " +
    "restaurant is set up before making queries or creating orders.",
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

    // Fetch config endpoints in parallel
    const [restaurant, revenueCenters, diningOptions, serviceAreas] =
      await Promise.all([
        client
          .get<RestaurantInfo>(
            `/restaurants/v1/restaurants/${guid}`,
            undefined,
            guid
          )
          .catch(() => null),
        client
          .get<RevenueCenter[]>(
            "/config/v2/revenueCenters",
            undefined,
            guid
          )
          .catch(() => []),
        client
          .get<DiningOption[]>(
            "/config/v2/diningOptions",
            undefined,
            guid
          )
          .catch(() => []),
        client
          .get<ServiceArea[]>(
            "/config/v2/serviceAreas",
            undefined,
            guid
          )
          .catch(() => []),
      ]);

    return jsonResult({
      restaurantGuid: guid,
      restaurant: restaurant
        ? {
            name: restaurant.name,
            timezone: restaurant.timezone,
            currencyCode: restaurant.currencyCode,
          }
        : null,
      revenueCenters: Array.isArray(revenueCenters)
        ? revenueCenters.map((rc) => ({
            guid: rc.guid,
            name: rc.name,
          }))
        : [],
      diningOptions: Array.isArray(diningOptions)
        ? diningOptions.map((d) => ({
            guid: d.guid,
            name: d.name,
            behavior: d.behavior,
          }))
        : [],
      serviceAreas: Array.isArray(serviceAreas)
        ? serviceAreas.map((sa) => ({
            guid: sa.guid,
            name: sa.name,
          }))
        : [],
    });
  },
};
