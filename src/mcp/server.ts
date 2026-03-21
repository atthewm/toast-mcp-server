import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Config } from "../config/index.js";
import { ToastClient } from "../toast/index.js";
import { EventEmitter } from "../events/index.js";
import { TeamsBridge } from "../bridge/index.js";
import { logger } from "../utils/index.js";
import {
  ToolRegistry,
  type ToolContext,
  authStatusTool,
  listRestaurantsTool,
  restaurantInfoTool,
  configSummaryTool,
  menuMetadataTool,
  getMenuTool,
  searchMenuItemsTool,
  getOrderTool,
  listOrdersTool,
  healthcheckTool,
  capabilitiesTool,
  priceOrderTool,
  createOrderTool,
  updateOrderTool,
} from "../tools/index.js";

/**
 * Create and configure the MCP server with all tools registered.
 */
export function createServer(config: Config): {
  server: McpServer;
  client: ToastClient;
  events: EventEmitter;
} {
  const client = new ToastClient(config);
  const events = new EventEmitter();

  // Set up Teams bridge if configured
  const teamsBridge = new TeamsBridge(
    config.microsoftTeamsWebhookUrl,
    config.microsoftBridgeEnabled
  );

  if (teamsBridge.isEnabled()) {
    events.on("*", async (event) => {
      const message = teamsBridge.formatMessage(event);
      await teamsBridge.send(message);
    });
    logger.info("Teams bridge enabled for event forwarding");
  }

  // Register tools into our internal registry (handles write gating)
  const registry = new ToolRegistry(config);

  // Read tools (always available)
  registry.register(authStatusTool);
  registry.register(listRestaurantsTool);
  registry.register(restaurantInfoTool);
  registry.register(configSummaryTool);
  registry.register(menuMetadataTool);
  registry.register(getMenuTool);
  registry.register(searchMenuItemsTool);
  registry.register(getOrderTool);
  registry.register(listOrdersTool);
  registry.register(healthcheckTool);
  registry.register(capabilitiesTool);

  // Write tools (gated by ALLOW_WRITES)
  registry.register(priceOrderTool);
  registry.register(createOrderTool);
  registry.register(updateOrderTool);

  logger.info(`Registered ${registry.size} tools`, {
    writesEnabled: config.allowWrites,
  });

  // Create MCP server
  const server = new McpServer({
    name: "toast-mcp-server",
    version: "0.1.0",
  });

  const context: ToolContext = { client, config };

  // Register each tool with the MCP server by passing the Zod shape directly
  for (const def of registry.getDefinitions()) {
    const shape = def.inputSchema.shape;
    const toolName = def.name;

    server.tool(
      toolName,
      def.description,
      shape,
      async (args) => {
        return await registry.executeTool(toolName, args as Record<string, unknown>, context);
      }
    );
  }

  return { server, client, events };
}

/**
 * Start the MCP server using stdio transport.
 */
export async function startServer(config: Config): Promise<void> {
  const { server } = createServer(config);

  const transport = new StdioServerTransport();

  logger.info("Starting Toast MCP server via stdio transport");

  await server.connect(transport);
}
