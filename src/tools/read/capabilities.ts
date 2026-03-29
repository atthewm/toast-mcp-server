import { z } from "zod";
import type { ToolDefinition } from "../registry.js";
import { jsonResult } from "../registry.js";

export const capabilitiesTool: ToolDefinition = {
  name: "toast_api_capabilities",
  description:
    "Summarize which features are available based on current configuration " +
    "and credentials. Helps understand what operations the server can perform.",
  inputSchema: z.object({}),
  async execute(_input, { client, config }) {
    const authenticated = await client.verifyAuth();
    const guids = client.getRestaurantGuids();

    return jsonResult({
      authentication: {
        configured: true,
        working: authenticated,
      },
      restaurants: {
        count: guids.length,
        multiLocation: guids.length > 1,
        guids,
      },
      readOperations: {
        restaurantInfo: authenticated,
        configSummary: authenticated,
        menuMetadata: authenticated,
        fullMenu: authenticated,
        menuSearch: authenticated,
        orders: authenticated,
        labor: authenticated,
        reporting: false, // TODO: requires specific scopes
      },
      writeOperations: {
        enabled: config.allowWrites,
        dryRun: config.dryRun,
        priceOrder: authenticated && config.allowWrites,
        createOrder: authenticated && config.allowWrites && !config.dryRun,
        updateOrder: authenticated && config.allowWrites && !config.dryRun,
      },
      integrations: {
        teamsWebhook: !!config.microsoftTeamsWebhookUrl,
        teamsBridge: config.microsoftBridgeEnabled,
        webhookIngestion: !!config.webhookSecret,
        partnerMode: config.partnerMode,
      },
      notes: [
        "Reporting tools require specific Toast API scopes that may not be available.",
        "Write operations require ALLOW_WRITES=true in configuration.",
        "Order creation/updates also require DRY_RUN=false.",
        "Teams integration requires a valid webhook URL.",
      ],
    });
  },
};
