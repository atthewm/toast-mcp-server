import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { ConfigSchema, type Config } from "./schema.js";

/**
 * Parse a simple .env file into key=value pairs.
 * Does not override existing environment variables.
 */
function loadDotEnv(path: string): void {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

/**
 * Parse a comma-separated string into an array of trimmed, non-empty strings.
 */
function parseCommaSeparated(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Parse a string as a boolean. Accepts "true", "1", "yes" as truthy.
 */
function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["true", "1", "yes"].includes(value.toLowerCase());
}

/**
 * Load and validate configuration from environment variables.
 * Loads .env file if present. Returns validated config or throws with
 * a human-readable error message.
 */
export function loadConfig(): Config {
  // Load .env file from project root
  loadDotEnv(resolve(process.cwd(), ".env"));

  const env = process.env;

  // Build restaurant GUIDs list
  const guids = parseCommaSeparated(env.TOAST_RESTAURANT_GUIDS);
  if (guids.length === 0 && env.TOAST_RESTAURANT_GUID) {
    guids.push(env.TOAST_RESTAURANT_GUID);
  }

  const raw = {
    toastClientId: env.TOAST_CLIENT_ID ?? "",
    toastClientSecret: env.TOAST_CLIENT_SECRET ?? "",
    toastRestaurantGuid: env.TOAST_RESTAURANT_GUID,
    toastRestaurantGuids: guids,
    toastApiHost: env.TOAST_API_HOST || "https://ws-api.toasttab.com",
    allowWrites: parseBool(env.ALLOW_WRITES, false),
    dryRun: parseBool(env.DRY_RUN, true),
    logLevel: env.LOG_LEVEL || "info",
    partnerMode: parseBool(env.PARTNER_MODE, false),
    webhookSecret: env.WEBHOOK_SECRET,
    webhookPort: env.WEBHOOK_PORT ? parseInt(env.WEBHOOK_PORT, 10) : 3100,
    microsoftTeamsWebhookUrl: env.MICROSOFT_TEAMS_WEBHOOK_URL || undefined,
    microsoftBridgeEnabled: parseBool(env.MICROSOFT_BRIDGE_ENABLED, false),
  };

  const result = ConfigSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Configuration validation failed:\n${issues}\n\n` +
        `Hint: Copy .env.example to .env and fill in your Toast API credentials.`
    );
  }

  return result.data;
}
