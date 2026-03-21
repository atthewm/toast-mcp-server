import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import {
  ToolRegistry,
  textResult,
  jsonResult,
  type ToolResult,
  type ToolContext,
} from "../../src/tools/registry.js";
import type { ToolDefinition } from "../../src/tools/registry.js";
import type { ToastClient } from "../../src/toast/client.js";
import { createMockConfig } from "../fixtures/api-responses.js";

/**
 * Create a simple read tool definition for testing.
 */
function makeReadTool(name: string): ToolDefinition {
  return {
    name,
    description: `A test read tool called ${name}`,
    inputSchema: z.object({
      query: z.string().optional(),
    }),
    async execute(input) {
      return textResult(`Executed ${name} with query: ${input.query ?? "none"}`);
    },
  };
}

/**
 * Create a simple write tool definition for testing.
 */
function makeWriteTool(name: string): ToolDefinition {
  return {
    name,
    description: `A test write tool called ${name}`,
    requiresWrite: true,
    inputSchema: z.object({
      confirm_write: z.boolean(),
      payload: z.string(),
    }),
    async execute(input) {
      return textResult(`Write executed: ${input.payload}`);
    },
  };
}

/**
 * Build a minimal mock ToolContext for testing.
 */
function makeContext(configOverrides: Record<string, unknown> = {}): ToolContext {
  const config = createMockConfig(configOverrides);
  return {
    client: {} as ToastClient,
    config,
  };
}

describe("ToolRegistry", () => {
  describe("tool registration", () => {
    it("should register a read tool and make it available", () => {
      const registry = new ToolRegistry(createMockConfig());
      const tool = makeReadTool("toast_test_read");

      registry.register(tool);

      expect(registry.hasTool("toast_test_read")).toBe(true);
      expect(registry.size).toBe(1);
    });

    it("should register multiple tools", () => {
      const registry = new ToolRegistry(createMockConfig());

      registry.register(makeReadTool("tool_a"));
      registry.register(makeReadTool("tool_b"));
      registry.register(makeReadTool("tool_c"));

      expect(registry.size).toBe(3);
      expect(registry.hasTool("tool_a")).toBe(true);
      expect(registry.hasTool("tool_b")).toBe(true);
      expect(registry.hasTool("tool_c")).toBe(true);
    });

    it("should return all registered definitions via getDefinitions", () => {
      const registry = new ToolRegistry(createMockConfig());
      registry.register(makeReadTool("tool_x"));
      registry.register(makeReadTool("tool_y"));

      const defs = registry.getDefinitions();
      expect(defs).toHaveLength(2);
      const names = defs.map((d) => d.name);
      expect(names).toContain("tool_x");
      expect(names).toContain("tool_y");
    });
  });

  describe("write tool gating (ALLOW_WRITES=false)", () => {
    it("should skip write tools when allowWrites is false", () => {
      const registry = new ToolRegistry(
        createMockConfig({ allowWrites: false })
      );

      registry.register(makeReadTool("read_tool"));
      registry.register(makeWriteTool("write_tool"));

      expect(registry.hasTool("read_tool")).toBe(true);
      expect(registry.hasTool("write_tool")).toBe(false);
      expect(registry.size).toBe(1);
    });

    it("should register write tools when allowWrites is true", () => {
      const registry = new ToolRegistry(
        createMockConfig({ allowWrites: true })
      );

      registry.register(makeReadTool("read_tool"));
      registry.register(makeWriteTool("write_tool"));

      expect(registry.hasTool("read_tool")).toBe(true);
      expect(registry.hasTool("write_tool")).toBe(true);
      expect(registry.size).toBe(2);
    });

    it("should always register read tools regardless of allowWrites", () => {
      const registryOff = new ToolRegistry(
        createMockConfig({ allowWrites: false })
      );
      const registryOn = new ToolRegistry(
        createMockConfig({ allowWrites: true })
      );

      const readTool = makeReadTool("always_available");
      registryOff.register(readTool);
      registryOn.register(readTool);

      expect(registryOff.hasTool("always_available")).toBe(true);
      expect(registryOn.hasTool("always_available")).toBe(true);
    });
  });

  describe("tool execution with valid input", () => {
    it("should execute a registered tool and return its result", async () => {
      const registry = new ToolRegistry(createMockConfig());
      registry.register(makeReadTool("test_tool"));

      const result = await registry.executeTool(
        "test_tool",
        { query: "hello" },
        makeContext()
      );

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Executed test_tool");
      expect(result.content[0].text).toContain("hello");
    });

    it("should pass the context to the tool execute function", async () => {
      const executeSpy = vi.fn().mockResolvedValue(textResult("ok"));

      const tool: ToolDefinition = {
        name: "context_test",
        description: "Tests context passing",
        inputSchema: z.object({}),
        execute: executeSpy,
      };

      const registry = new ToolRegistry(createMockConfig());
      registry.register(tool);

      const context = makeContext();
      await registry.executeTool("context_test", {}, context);

      expect(executeSpy).toHaveBeenCalledOnce();
      const [, passedContext] = executeSpy.mock.calls[0];
      expect(passedContext).toBe(context);
    });
  });

  describe("tool execution with invalid input", () => {
    it("should return an error result for invalid input", async () => {
      const tool: ToolDefinition = {
        name: "strict_tool",
        description: "Requires a number",
        inputSchema: z.object({
          count: z.number().int().positive(),
        }),
        async execute(input) {
          return textResult(`Count: ${input.count}`);
        },
      };

      const registry = new ToolRegistry(createMockConfig());
      registry.register(tool);

      const result = await registry.executeTool(
        "strict_tool",
        { count: "not_a_number" },
        makeContext()
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid input");
      expect(result.content[0].text).toContain("strict_tool");
    });

    it("should include validation issue details in the error", async () => {
      const tool: ToolDefinition = {
        name: "multi_field",
        description: "Multiple required fields",
        inputSchema: z.object({
          name: z.string().min(1),
          age: z.number().positive(),
        }),
        async execute() {
          return textResult("ok");
        },
      };

      const registry = new ToolRegistry(createMockConfig());
      registry.register(tool);

      const result = await registry.executeTool(
        "multi_field",
        {},
        makeContext()
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid input");
    });
  });

  describe("unknown tool handling", () => {
    it("should return an error for an unregistered tool name", async () => {
      const registry = new ToolRegistry(createMockConfig());

      const result = await registry.executeTool(
        "nonexistent_tool",
        {},
        makeContext()
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unknown tool");
      expect(result.content[0].text).toContain("nonexistent_tool");
    });

    it("should report false for hasTool on an unregistered name", () => {
      const registry = new ToolRegistry(createMockConfig());
      expect(registry.hasTool("ghost_tool")).toBe(false);
    });
  });

  describe("tool execution error handling", () => {
    it("should catch errors thrown by tool execute and return error result", async () => {
      const tool: ToolDefinition = {
        name: "throws_tool",
        description: "Always throws",
        inputSchema: z.object({}),
        async execute() {
          throw new Error("Something broke");
        },
      };

      const registry = new ToolRegistry(createMockConfig());
      registry.register(tool);

      const result = await registry.executeTool(
        "throws_tool",
        {},
        makeContext()
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Something broke");
    });
  });

  describe("helper functions", () => {
    it("textResult should return the expected shape", () => {
      const result = textResult("hello world");
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toBe("hello world");
      expect(result.isError).toBeUndefined();
    });

    it("jsonResult should return pretty printed JSON", () => {
      const data = { items: [1, 2, 3], name: "test" };
      const result = jsonResult(data);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(JSON.parse(result.content[0].text)).toEqual(data);
      // Should be indented with 2 spaces
      expect(result.content[0].text).toContain("  ");
    });
  });
});
