import { z } from "zod";
import type { ToolDefinition } from "../registry.js";
import { jsonResult } from "../registry.js";

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

    const order = await client.get<Record<string, unknown>>(
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
    "List orders for a business day. Returns order count and summary details " +
    "for each order (fetches up to 20 full order details). Use businessDate " +
    "in YYYYMMDD format.",
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
    detailCount: z
      .number()
      .optional()
      .default(20)
      .describe("Number of orders to fetch full details for. Default: 20."),
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

    const params: Record<string, string | number | boolean | undefined> = {};
    if (input.businessDate) {
      params.businessDate = input.businessDate;
    }

    // The list endpoint returns an array of GUID strings
    const orderGuids = await client.get<string[]>(
      "/orders/v2/orders",
      params,
      guid
    );

    const guids = Array.isArray(orderGuids) ? orderGuids : [];
    const detailCount = Math.min(input.detailCount ?? 20, 200);

    // Fetch details for the first N orders
    const orderDetails: Array<Record<string, unknown>> = [];
    const fetchGuids = guids.slice(0, detailCount);

    // Fetch in parallel batches of 5 to avoid overwhelming the API
    for (let i = 0; i < fetchGuids.length; i += 5) {
      const batch = fetchGuids.slice(i, i + 5);
      const results = await Promise.all(
        batch.map((orderGuid) =>
          client
            .get<Record<string, unknown>>(
              `/orders/v2/orders/${orderGuid}`,
              undefined,
              guid
            )
            .catch(() => null)
        )
      );
      for (const r of results) {
        if (r) orderDetails.push(r);
      }
    }

    // Build summary
    let totalSales = 0;
    const summaries = orderDetails.map((o) => {
      const checks = (o.checks as Array<Record<string, unknown>>) ?? [];
      const orderTotal = checks.reduce(
        (sum, c) => sum + ((c.totalAmount as number) ?? 0),
        0
      );
      totalSales += orderTotal;

      const selections = checks.flatMap(
        (c) => (c.selections as Array<Record<string, unknown>>) ?? []
      );

      const diningOpt = o.diningOption as Record<string, unknown> | undefined;
      const server = o.server as Record<string, unknown> | undefined;

      return {
        guid: o.guid as string,
        displayNumber: o.displayNumber as string | undefined,
        openedDate: o.openedDate as string | undefined,
        closedDate: o.closedDate as string | undefined,
        diningOption: diningOpt?.guid as string | undefined,
        diningOptionName: diningOpt?.name as string | undefined,
        serverName: server?.name as string | undefined,
        source: o.source as string | undefined,
        total: orderTotal,
        itemCount: selections.length,
        voided: o.voided as boolean | undefined,
      };
    });

    return jsonResult({
      totalOrders: guids.length,
      detailsFetched: orderDetails.length,
      totalSales: Math.round(totalSales * 100) / 100,
      orders: summaries,
    });
  },
};
