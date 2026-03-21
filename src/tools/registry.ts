import { z, type ZodRawShape } from "zod";
import type { Config } from "../config/index.js";
import type { ToastClient } from "../toast/index.js";
import { logger, formatErrorForTool } from "../utils/index.js";

/**
 * Result from a tool execution, compatible with MCP tool response format.
 */
export interface ToolResult {
  [key: string]: unknown;
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Definition of an MCP tool with typed input schema.
 */
export interface ToolDefinition<TShape extends ZodRawShape = ZodRawShape> {
  name: string;
  description: string;
  inputSchema: z.ZodObject<TShape>;
  /** If true, this tool requires ALLOW_WRITES=true */
  requiresWrite?: boolean;
  /** Execute the tool with validated input */
  execute: (
    input: z.infer<z.ZodObject<TShape>>,
    context: ToolContext
  ) => Promise<ToolResult>;
}

/**
 * Context passed to tool execution, providing access to the client and config.
 */
export interface ToolContext {
  client: ToastClient;
  config: Config;
}

/**
 * A registered tool entry storing the definition for later dispatch.
 */
interface RegisteredEntry {
  definition: ToolDefinition;
}

/**
 * Registry that manages tool definitions and enforces write gating.
 */
export class ToolRegistry {
  private tools: Map<string, RegisteredEntry> = new Map();

  constructor(private readonly config: Config) {}

  /**
   * Register a tool definition.
   */
  register(tool: ToolDefinition): void {
    if (tool.requiresWrite && !this.config.allowWrites) {
      logger.info(`Skipping write tool "${tool.name}" (ALLOW_WRITES=false)`);
      return;
    }
    this.tools.set(tool.name, { definition: tool });
    logger.debug(`Registered tool: ${tool.name}`);
  }

  /**
   * Get all registered tool definitions for MCP server registration.
   */
  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((e) => e.definition);
  }

  /**
   * Execute a tool by name with the given arguments.
   */
  async executeTool(
    name: string,
    args: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    const entry = this.tools.get(name);
    if (!entry) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    const { definition } = entry;

    // Validate input
    const parseResult = definition.inputSchema.safeParse(args);
    if (!parseResult.success) {
      const issues = parseResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      return {
        content: [
          {
            type: "text",
            text: `Invalid input for "${name}": ${issues}`,
          },
        ],
        isError: true,
      };
    }

    try {
      return await definition.execute(parseResult.data, context);
    } catch (error) {
      logger.error(`Tool "${name}" execution failed`, {
        error:
          error instanceof Error ? error.message : String(error),
      });
      return {
        content: [{ type: "text", text: formatErrorForTool(error) }],
        isError: true,
      };
    }
  }

  /**
   * Check if a tool is registered.
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get the count of registered tools.
   */
  get size(): number {
    return this.tools.size;
  }
}

/**
 * Helper to create a successful text result.
 */
export function textResult(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

/**
 * Helper to create a JSON result.
 */
export function jsonResult(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}
