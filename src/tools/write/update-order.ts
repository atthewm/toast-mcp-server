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

export const updateOrderTool: ToolDefinition = {
  name: "toast_update_order",
  description:
    "WRITE OPERATION: Update an existing order in Toast. THIS WILL MODIFY " +
    "A REAL ORDER which may affect kitchen operations and charges. " +
    "Requires ALLOW_WRITES=true AND DRY_RUN=false. You MUST set " +
    "confirm_write=true to proceed.",
  requiresWrite: true,
  inputSchema: z.object({
    confirm_write: z
      .boolean()
      .describe(
        "REQUIRED: Must be set to true to confirm you intend to modify " +
          "a real order. This is a safety gate."
      ),
    orderGuid: z.string().describe("GUID of the order to update."),
    restaurantGuid: z
      .string()
      .optional()
      .describe("Restaurant GUID. Uses default if not provided."),
    addSelections: z
      .array(
        z.object({
          itemGuid: z.string(),
          quantity: z.number().int().positive(),
          modifiers: z
            .array(z.object({ guid: z.string(), quantity: z.number().optional() }))
            .optional(),
          specialInstructions: z.string().optional(),
        })
      )
      .optional()
      .describe("New items to add to the order."),
  }),
  async execute(input, { client, config }) {
    if (!input.confirm_write) {
      return textResult(
        "Order update requires confirm_write=true. This is a safety " +
          "measure because modifying an order may affect kitchen operations. " +
          "Set confirm_write=true if you intend to proceed."
      );
    }

    if (config.dryRun) {
      return textResult(
        "DRY_RUN is enabled. Order would be updated but was not actually " +
          "modified. Set DRY_RUN=false to enable real order updates.\n\n" +
          `Order: ${input.orderGuid}\n` +
          `Additions: ${JSON.stringify(input.addSelections ?? [], null, 2)}`
      );
    }

    if (!config.allowWrites) {
      throw new WriteNotAllowedError("toast_update_order");
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

    logger.warn("Updating order via MCP tool", {
      restaurantGuid: guid,
      orderGuid: input.orderGuid,
    });

    // First get the existing order
    const existing = await client.get<Record<string, unknown>>(
      `/orders/v2/orders/${input.orderGuid}`,
      undefined,
      guid
    );

    const payload: Record<string, unknown> = { ...existing };

    if (input.addSelections) {
      const additions = input.addSelections as SelectionInput[];
      const checks = Array.isArray(payload.checks) ? payload.checks as Array<Record<string, unknown>> : [];
      if (checks.length > 0) {
        const firstCheck = checks[0];
        const existingSelections = Array.isArray(firstCheck.selections)
          ? firstCheck.selections as unknown[]
          : [];
        firstCheck.selections = [
          ...existingSelections,
          ...additions.map((s: SelectionInput) => ({
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
        ];
      }
    }

    const result = await client.patch(
      `/orders/v2/orders/${input.orderGuid}`,
      payload,
      guid
    );

    return jsonResult({
      warning: "The order was modified. Changes may appear on kitchen displays.",
      order: result,
    });
  },
};
