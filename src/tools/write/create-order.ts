import { z } from "zod";
import type { ToolDefinition } from "../registry.js";
import { jsonResult, textResult } from "../registry.js";
import { logger, WriteNotAllowedError } from "../../utils/index.js";

interface SelectionInput {
  itemGuid: string;
  quantity: number;
  modifiers?: Array<{ guid: string; quantity?: number }>;
  specialInstructions?: string;
}

export const createOrderTool: ToolDefinition = {
  name: "toast_create_order",
  description:
    "WRITE OPERATION: Create a new order in Toast. THIS WILL CREATE A REAL " +
    "ORDER that may be sent to the kitchen and result in charges. " +
    "Requires ALLOW_WRITES=true AND DRY_RUN=false. You MUST set " +
    "confirm_write=true to proceed. Consider using toast_price_order first " +
    "to validate and price the order before creating it.",
  requiresWrite: true,
  inputSchema: z.object({
    confirm_write: z
      .boolean()
      .describe(
        "REQUIRED: Must be set to true to confirm you intend to create " +
          "a real order. This is a safety gate."
      ),
    restaurantGuid: z
      .string()
      .optional()
      .describe("Restaurant GUID. Uses default if not provided."),
    diningOptionGuid: z
      .string()
      .describe("Dining option GUID (e.g., dine in, takeout). Required."),
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
      .describe("Items to include in the order."),
    customerFirstName: z.string().optional(),
    customerLastName: z.string().optional(),
    customerEmail: z.string().optional(),
    customerPhone: z.string().optional(),
  }),
  async execute(input, { client, config }) {
    if (!input.confirm_write) {
      return textResult(
        "Order creation requires confirm_write=true. This is a safety " +
          "measure because creating an order may result in kitchen tickets " +
          "and charges. Set confirm_write=true if you intend to proceed."
      );
    }

    if (config.dryRun) {
      return textResult(
        "DRY_RUN is enabled. Order would be created with the following " +
          "selections but was not actually submitted. Set DRY_RUN=false " +
          "in your environment to enable real order creation.\n\n" +
          JSON.stringify(input.selections, null, 2)
      );
    }

    if (!config.allowWrites) {
      throw new WriteNotAllowedError("toast_create_order");
    }

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

    logger.warn("Creating order via MCP tool", {
      restaurantGuid: guid,
      selectionCount: input.selections.length,
    });

    const customer =
      input.customerFirstName || input.customerLastName
        ? {
            firstName: input.customerFirstName,
            lastName: input.customerLastName,
            email: input.customerEmail,
            phone: input.customerPhone,
          }
        : undefined;

    const selections = input.selections as SelectionInput[];

    const payload: Record<string, unknown> = {
      entityType: "Order",
      diningOption: { guid: input.diningOptionGuid },
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
          customer,
        },
      ],
    };

    const result = await client.post("/orders/v2/orders", payload, guid);

    return jsonResult({
      warning: "A real order was created. It may appear on kitchen displays.",
      order: result,
    });
  },
};
