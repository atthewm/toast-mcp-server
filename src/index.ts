#!/usr/bin/env node

import { loadConfig } from "./config/index.js";
import { startServer } from "./mcp/index.js";
import { logger } from "./utils/index.js";

async function main(): Promise<void> {
  try {
    const config = loadConfig();
    logger.setLevel(config.logLevel);

    logger.info("Toast MCP Server starting", {
      version: "0.1.0",
      apiHost: config.toastApiHost,
      restaurants: config.toastRestaurantGuids.length,
      writesEnabled: config.allowWrites,
      dryRun: config.dryRun,
    });

    await startServer(config);
  } catch (error) {
    // Write startup errors to stderr so MCP transport stays clean
    process.stderr.write(
      `\nFailed to start Toast MCP Server:\n${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exit(1);
  }
}

main();
