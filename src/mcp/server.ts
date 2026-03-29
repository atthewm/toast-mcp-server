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
  listShiftsTool,
  priceOrderTool,
  createOrderTool,
  updateOrderTool,
} from "../tools/index.js";

/**
 * Shared state that persists across sessions (client, events, config).
 */
interface ServerContext {
  client: ToastClient;
  events: EventEmitter;
  config: Config;
}

function createContext(config: Config): ServerContext {
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

  return { client, events, config };
}

/**
 * Create a new McpServer instance with all tools registered.
 * Each transport connection needs its own McpServer instance.
 */
export function createServer(config: Config): {
  server: McpServer;
  client: ToastClient;
  events: EventEmitter;
} {
  const ctx = createContext(config);
  const server = buildMcpServer(ctx);
  return { server, client: ctx.client, events: ctx.events };
}

function buildMcpServer(ctx: ServerContext): McpServer {
  const { config, client } = ctx;

  // Register tools
  const registry = new ToolRegistry(config);

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
  registry.register(listShiftsTool);
  registry.register(priceOrderTool);
  registry.register(createOrderTool);
  registry.register(updateOrderTool);

  logger.info(`Registered ${registry.size} tools`, {
    writesEnabled: config.allowWrites,
  });

  const server = new McpServer({
    name: "toast-mcp-server",
    version: "0.2.0",
  });

  const context: ToolContext = { client, config };

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

  return server;
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
 *
 * Each new session gets its own McpServer instance since the SDK
 * only allows one transport per server. The Toast client and config
 * are shared across all sessions.
 */
export async function startHttpServer(config: Config): Promise<void> {
  const ctx = createContext(config);

  const app = express();

  const authMiddleware = createAuthMiddleware(config);

  // Health endpoint (no auth, needs JSON parsing)
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", version: "0.2.0" });
  });

  // Active sessions: transport + server per session
  const sessions = new Map<
    string,
    { transport: StreamableHTTPServerTransport; server: McpServer }
  >();

  // MCP endpoint
  app.all("/mcp", authMiddleware, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      await session.transport.handleRequest(req, res);
      return;
    }

    if (sessionId && !sessions.has(sessionId)) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    // New session
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    const server = buildMcpServer(ctx);

    transport.onclose = () => {
      if (transport.sessionId) {
        sessions.delete(transport.sessionId);
        logger.debug("Session closed", { sessionId: transport.sessionId });
      }
    };

    await server.connect(transport);
    await transport.handleRequest(req, res);

    // Session ID is set after handleRequest processes the initialize request
    if (transport.sessionId) {
      sessions.set(transport.sessionId, { transport, server });
      logger.debug("New session created", { sessionId: transport.sessionId });
    }
  });

  // Session cleanup
  app.delete("/mcp", authMiddleware, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      await session.transport.close();
      sessions.delete(sessionId);
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
