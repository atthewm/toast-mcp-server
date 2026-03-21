import { z } from "zod";
import type { ToolDefinition } from "../registry.js";
import { jsonResult } from "../registry.js";
import type { Order } from "../../models/index.js";

export const getOrderTool: ToolDefinition = {
  name: "toast_get_order",
  description:
    "Get details for a specific order by its GUID. Returns order info " +
    "including checks, selections, amounts, server, and timing.",
  inputSchema: z.object({
    orderGuid: z.string().describe("The GUID of the order to retrieve."),
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

    const order = await client.get<Order>(
      `/orders/v2/orders/${input.orderGuid}`,
      undefined,
      guid
    );

    return jsonResult(order);
  },
};

export const listOrdersTool: ToolDefinition = {
  name: "toast_list_orders",
  description:
    "List recent orders with optional filters. Returns orders sorted by " +
    "date. Use businessDate for filtering by a specific business day " +
    "(YYYYMMDD format).",
  inputSchema: z.object({
    restaurantGuid: z
      .string()
      .optional()
      .describe("Restaurant GUID. Uses default if not provided."),
    businessDate: z
      .string()
      .optional()
      .describe(
        "Business date in YYYYMMDD format (e.g. 20260321). " +
          "Filters orders to a specific business day."
      ),
    pageSize: z
      .number()
      .optional()
      .default(25)
      .describe("Number of orders to return. Default: 25, max: 100."),
    pageToken: z
      .string()
      .optional()
      .describe("Pagination token from a previous response."),
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

    const pageSize = Math.min(input.pageSize ?? 25, 100);

    const params: Record<string, string | number | boolean | undefined> = {
      pageSize,
      page: input.pageToken,
    };

    if (input.businessDate) {
      params.businessDate = input.businessDate;
    }

    const orders = await client.get<Order[]>(
      "/orders/v2/orders",
      params,
      guid
    );

    return jsonResult({
      count: Array.isArray(orders) ? orders.length : 0,
      orders: Array.isArray(orders) ? orders : [],
    });
  },
};
