import { z } from "zod";
import type { ToolDefinition } from "../registry.js";
import { jsonResult } from "../registry.js";

interface SelectionInput {
  itemGuid: string;
  quantity: number;
  modifiers?: Array<{ guid: string; quantity?: number }>;
  specialInstructions?: string;
}

export const priceOrderTool: ToolDefinition = {
  name: "toast_price_order",
  description:
    "WRITE OPERATION: Validate a proposed order and get pricing without " +
    "actually creating the order. Returns calculated subtotal, tax, and total. " +
    "Requires ALLOW_WRITES=true. This is a safe validation step; no order is " +
    "created or charged.",
  requiresWrite: true,
  inputSchema: z.object({
    restaurantGuid: z
      .string()
      .optional()
      .describe("Restaurant GUID. Uses default if not provided."),
    diningOptionGuid: z
      .string()
      .optional()
      .describe("Dining option GUID (e.g., dine in, takeout)."),
    revenueCenterGuid: z
      .string()
      .optional()
      .describe("Revenue center GUID."),
    selections: z
      .array(
        z.object({
          itemGuid: z.string().describe("GUID of the menu item."),
          quantity: z.number().int().positive().describe("Quantity of this item."),
          modifiers: z
            .array(
              z.object({
                guid: z.string().describe("Modifier GUID."),
                quantity: z.number().int().positive().optional(),
              })
            )
            .optional()
            .describe("Optional modifiers for this item."),
          specialInstructions: z.string().optional().describe("Special instructions for this item."),
        })
      )
      .min(1)
      .describe("Items to include in the order for pricing."),
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

    const selections = input.selections as SelectionInput[];

    const payload: Record<string, unknown> = {
      entityType: "Order",
      diningOption: input.diningOptionGuid
        ? { guid: input.diningOptionGuid }
        : undefined,
      revenueCenter: input.revenueCenterGuid
        ? { guid: input.revenueCenterGuid }
        : undefined,
      checks: [
        {
          entityType: "Check",
          selections: selections.map((s: SelectionInput) => ({
            entityType: "MenuItemSelection",
            itemGroup: { guid: s.itemGuid },
            item: { guid: s.itemGuid },
            quantity: s.quantity,
            modifiers:
              s.modifiers?.map((m: { guid: string; quantity?: number }) => ({
                entityType: "MenuItemSelection",
                item: { guid: m.guid },
                quantity: m.quantity ?? 1,
              })) ?? [],
            specialInstructions: s.specialInstructions,
          })),
        },
      ],
    };

    const result = await client.post(
      "/orders/v2/orders/price",
      payload,
      guid
    );

    return jsonResult({
      note: "This is a price estimate only. No order was created.",
      pricing: result,
    });
  },
};
