import { z } from "zod";

/**
 * Configuration schema for the Toast MCP server.
 * Validates environment variables at startup with friendly error messages.
 */
export const ConfigSchema = z.object({
  // Toast API credentials
  toastClientId: z.string().min(1, "TOAST_CLIENT_ID is required"),
  toastClientSecret: z.string().min(1, "TOAST_CLIENT_SECRET is required"),

  // Restaurant configuration
  toastRestaurantGuid: z.string().optional(),
  toastRestaurantGuids: z.array(z.string()).default([]),

  // API host
  toastApiHost: z
    .string()
    .url()
    .default("https://ws-api.toasttab.com"),

  // Safety controls
  allowWrites: z.boolean().default(false),
  dryRun: z.boolean().default(true),

  // Logging
  logLevel: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),

  // Partner mode
  partnerMode: z.boolean().default(false),

  // Webhook configuration
  webhookSecret: z.string().optional(),
  webhookPort: z.number().int().positive().default(3100),

  // Microsoft Teams integration (future)
  microsoftTeamsWebhookUrl: z.string().url().optional(),
  microsoftBridgeEnabled: z.boolean().default(false),
});

export type Config = z.infer<typeof ConfigSchema>;
