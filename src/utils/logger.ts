type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Simple structured logger that writes to stderr (keeping stdout clean for MCP).
 * Redacts known sensitive fields in logged objects.
 */
class Logger {
  private level: number;
  private static REDACT_KEYS = new Set([
    "clientSecret",
    "client_secret",
    "accessToken",
    "access_token",
    "refreshToken",
    "refresh_token",
    "authorization",
    "Authorization",
    "password",
    "secret",
    "webhookSecret",
    "webhook_secret",
  ]);

  constructor(level: LogLevel = "info") {
    this.level = LOG_LEVELS[level];
  }

  setLevel(level: LogLevel): void {
    this.level = LOG_LEVELS[level];
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log("error", message, data);
  }

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ): void {
    if (LOG_LEVELS[level] < this.level) return;

    const entry: Record<string, unknown> = {
      ts: new Date().toISOString(),
      level,
      msg: message,
    };

    if (data) {
      entry.data = this.redact(data);
    }

    process.stderr.write(JSON.stringify(entry) + "\n");
  }

  private redact(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (Logger.REDACT_KEYS.has(key)) {
        result[key] = "[REDACTED]";
      } else if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        result[key] = this.redact(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}

export const logger = new Logger();
export type { LogLevel };
