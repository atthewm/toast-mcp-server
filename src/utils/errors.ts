/**
 * Base error class for Toast MCP server errors.
 */
export class ToastMcpError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ToastMcpError";
  }
}

/**
 * Thrown when Toast API authentication fails.
 */
export class AuthenticationError extends ToastMcpError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "AUTH_ERROR", 401, details);
    this.name = "AuthenticationError";
  }
}

/**
 * Thrown when a Toast API request fails.
 */
export class ApiRequestError extends ToastMcpError {
  constructor(
    message: string,
    statusCode: number,
    details?: Record<string, unknown>
  ) {
    super(message, "API_ERROR", statusCode, details);
    this.name = "ApiRequestError";
  }
}

/**
 * Thrown when a write operation is attempted but not allowed.
 */
export class WriteNotAllowedError extends ToastMcpError {
  constructor(toolName: string) {
    super(
      `Write operation "${toolName}" is disabled. Set ALLOW_WRITES=true to enable write operations.`,
      "WRITE_NOT_ALLOWED",
      403
    );
    this.name = "WriteNotAllowedError";
  }
}

/**
 * Thrown when required configuration is missing or invalid.
 */
export class ConfigError extends ToastMcpError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR");
    this.name = "ConfigError";
  }
}

/**
 * Thrown when input validation fails for a tool invocation.
 */
export class ValidationError extends ToastMcpError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

/**
 * Format an error into a user-friendly MCP tool response.
 */
export function formatErrorForTool(error: unknown): string {
  if (error instanceof ToastMcpError) {
    let msg = `Error [${error.code}]: ${error.message}`;
    if (error.details) {
      msg += `\nDetails: ${JSON.stringify(error.details, null, 2)}`;
    }
    return msg;
  }

  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }

  return `Unknown error: ${String(error)}`;
}
