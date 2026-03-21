import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import type { Config } from "../config/index.js";
import { ToastClient } from "../toast/index.js";
import { EventEmitter } from "../events/index.js";
import { TeamsBridge } from "../bridge/index.js";
import { createAuthMiddleware } from "./auth-middleware.js";
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
    version: "0.2.0",
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
 * Start the MCP server using stdio transport (default, for local MCP clients).
 */
export async function startStdioServer(config: Config): Promise<void> {
  const { server } = createServer(config);
  const transport = new StdioServerTransport();

  logger.info("Starting Toast MCP server via stdio transport");
  await server.connect(transport);
}

/**
 * Start the MCP server using Streamable HTTP transport.
 * Required for Copilot Studio, Teams SDK, and cloud deployments.
 */
export async function startHttpServer(config: Config): Promise<void> {
  const { server } = createServer(config);

  const app = express();
  app.use(express.json());

  // Auth middleware for all /mcp routes
  const authMiddleware = createAuthMiddleware(config);

  // Health endpoint (no auth required)
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", version: "0.2.0" });
  });

  // Map of active transports by session ID
  const transports = new Map<string, StreamableHTTPServerTransport>();

  // MCP endpoint: handles POST (messages) and GET (SSE streams)
  app.all("/mcp", authMiddleware, async (req, res) => {
    // Check for existing session
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && transports.has(sessionId)) {
      // Existing session: route to the existing transport
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res);
      return;
    }

    if (sessionId && !transports.has(sessionId)) {
      // Unknown session ID
      res.status(404).json({ error: "Session not found" });
      return;
    }

    // New session: create a new transport
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        transports.delete(transport.sessionId);
        logger.debug("Session closed", { sessionId: transport.sessionId });
      }
    };

    // Connect the MCP server to this transport
    await server.connect(transport);

    if (transport.sessionId) {
      transports.set(transport.sessionId, transport);
      logger.debug("New session created", { sessionId: transport.sessionId });
    }

    await transport.handleRequest(req, res);
  });

  // DELETE endpoint for session cleanup
  app.delete("/mcp", authMiddleware, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.close();
      transports.delete(sessionId);
      res.status(200).json({ status: "session closed" });
    } else {
      res.status(404).json({ error: "Session not found" });
    }
  });

  const host = config.httpHost;
  const port = config.httpPort;

  app.listen(port, host, () => {
    logger.info(`Toast MCP server listening on http://${host}:${port}/mcp`, {
      transport: "streamable-http",
      auth: config.mcpApiKey
        ? "api-key"
        : config.entraIdTenantId
          ? "entra-id"
          : "none",
    });
  });
}

/**
 * Start the MCP server using the configured transport.
 */
export async function startServer(config: Config): Promise<void> {
  if (config.transport === "http") {
    await startHttpServer(config);
  } else {
    await startStdioServer(config);
  }
}
