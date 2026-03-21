import { z } from "zod";
import type { ToolDefinition } from "../registry.js";
import { jsonResult } from "../registry.js";

interface HealthStatus {
  overall: "healthy" | "degraded" | "unhealthy";
  checks: Record<
    string,
    { status: "pass" | "fail"; message: string; durationMs?: number }
  >;
  config: {
    restaurantsConfigured: number;
    writesEnabled: boolean;
    dryRun: boolean;
  };
}

export const healthcheckTool: ToolDefinition = {
  name: "toast_healthcheck",
  description:
    "Validate configuration, authentication, and core API connectivity " +
    "in one call. Returns a health status for each check. Useful for " +
    "verifying that the server is properly configured.",
  inputSchema: z.object({}),
  async execute(_input, { client, config }) {
    const status: HealthStatus = {
      overall: "healthy",
      checks: {},
      config: {
        restaurantsConfigured: config.toastRestaurantGuids.length,
        writesEnabled: config.allowWrites,
        dryRun: config.dryRun,
      },
    };

    // Check auth
    const authStart = Date.now();
    try {
      const authed = await client.verifyAuth();
      status.checks.authentication = {
        status: authed ? "pass" : "fail",
        message: authed
          ? "Successfully authenticated with Toast API"
          : "Authentication failed",
        durationMs: Date.now() - authStart,
      };
      if (!authed) status.overall = "unhealthy";
    } catch (error) {
      status.checks.authentication = {
        status: "fail",
        message: error instanceof Error ? error.message : "Auth check failed",
        durationMs: Date.now() - authStart,
      };
      status.overall = "unhealthy";
    }

    // Check restaurant config
    const guids = client.getRestaurantGuids();
    status.checks.restaurantConfig = {
      status: guids.length > 0 ? "pass" : "fail",
      message:
        guids.length > 0
          ? `${guids.length} restaurant(s) configured`
          : "No restaurant GUIDs configured",
    };
    if (guids.length === 0) {
      status.overall =
        status.overall === "unhealthy" ? "unhealthy" : "degraded";
    }

    // Check API connectivity with a lightweight call
    if (guids.length > 0 && status.checks.authentication?.status === "pass") {
      const apiStart = Date.now();
      try {
        await client.get(
          `/restaurants/v1/restaurants/${guids[0]}`,
          undefined,
          guids[0]
        );
        status.checks.apiConnectivity = {
          status: "pass",
          message: "Successfully reached Toast API",
          durationMs: Date.now() - apiStart,
        };
      } catch (error) {
        status.checks.apiConnectivity = {
          status: "fail",
          message:
            error instanceof Error
              ? error.message
              : "API connectivity check failed",
          durationMs: Date.now() - apiStart,
        };
        status.overall =
          status.overall === "unhealthy" ? "unhealthy" : "degraded";
      }
    }

    return jsonResult(status);
  },
};
