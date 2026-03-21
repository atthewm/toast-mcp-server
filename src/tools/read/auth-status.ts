import { z } from "zod";
import type { ToolDefinition } from "../registry.js";
import { jsonResult } from "../registry.js";

export const authStatusTool: ToolDefinition = {
  name: "toast_auth_status",
  description:
    "Verify Toast API credentials and report connection status. " +
    "Returns whether authentication is successful, the API host, " +
    "and configured restaurant GUIDs.",
  inputSchema: z.object({}),
  async execute(_input, { client, config }) {
    const authenticated = await client.verifyAuth();

    return jsonResult({
      authenticated,
      apiHost: config.toastApiHost,
      hasToken: client.hasValidToken(),
      configuredRestaurants: client.getRestaurantGuids(),
      defaultRestaurant: client.getDefaultRestaurantGuid() ?? null,
      writesEnabled: config.allowWrites,
      dryRun: config.dryRun,
      partnerMode: config.partnerMode,
    });
  },
};
