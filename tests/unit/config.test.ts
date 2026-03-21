import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConfigSchema } from "../../src/config/schema.js";
import { loadConfig } from "../../src/config/loader.js";

describe("ConfigSchema", () => {
  describe("valid config parsing", () => {
    it("should parse a fully populated config object", () => {
      const input = {
        toastClientId: "my_client_id",
        toastClientSecret: "my_client_secret",
        toastRestaurantGuid: "guid-001",
        toastRestaurantGuids: ["guid-001", "guid-002"],
        toastApiHost: "https://ws-api.toasttab.com",
        allowWrites: true,
        dryRun: false,
        logLevel: "debug",
        partnerMode: true,
        webhookSecret: "wh-secret",
        webhookPort: 4000,
        microsoftTeamsWebhookUrl: "https://outlook.office.com/webhook/test",
        microsoftBridgeEnabled: true,
      };

      const result = ConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.toastClientId).toBe("my_client_id");
        expect(result.data.toastClientSecret).toBe("my_client_secret");
        expect(result.data.allowWrites).toBe(true);
        expect(result.data.dryRun).toBe(false);
        expect(result.data.logLevel).toBe("debug");
        expect(result.data.webhookPort).toBe(4000);
        expect(result.data.microsoftBridgeEnabled).toBe(true);
      }
    });

    it("should parse a minimal config with only required fields", () => {
      const input = {
        toastClientId: "my_id",
        toastClientSecret: "my_secret",
      };

      const result = ConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.toastClientId).toBe("my_id");
        expect(result.data.toastClientSecret).toBe("my_secret");
      }
    });
  });

  describe("missing required fields", () => {
    it("should fail when toastClientId is missing", () => {
      const input = {
        toastClientSecret: "my_secret",
      };

      const result = ConfigSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should fail when toastClientSecret is missing", () => {
      const input = {
        toastClientId: "my_id",
      };

      const result = ConfigSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should fail when toastClientId is an empty string", () => {
      const input = {
        toastClientId: "",
        toastClientSecret: "my_secret",
      };

      const result = ConfigSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        const idIssue = result.error.issues.find((i) =>
          i.path.includes("toastClientId")
        );
        expect(idIssue).toBeDefined();
      }
    });

    it("should fail when toastClientSecret is an empty string", () => {
      const input = {
        toastClientId: "my_id",
        toastClientSecret: "",
      };

      const result = ConfigSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("default values", () => {
    it("should default allowWrites to false", () => {
      const input = {
        toastClientId: "my_id",
        toastClientSecret: "my_secret",
      };

      const result = ConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allowWrites).toBe(false);
      }
    });

    it("should default dryRun to true", () => {
      const input = {
        toastClientId: "my_id",
        toastClientSecret: "my_secret",
      };

      const result = ConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dryRun).toBe(true);
      }
    });

    it("should default logLevel to info", () => {
      const input = {
        toastClientId: "my_id",
        toastClientSecret: "my_secret",
      };

      const result = ConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.logLevel).toBe("info");
      }
    });

    it("should default toastApiHost to the production URL", () => {
      const input = {
        toastClientId: "my_id",
        toastClientSecret: "my_secret",
      };

      const result = ConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.toastApiHost).toBe("https://ws-api.toasttab.com");
      }
    });

    it("should default partnerMode to false", () => {
      const input = {
        toastClientId: "my_id",
        toastClientSecret: "my_secret",
      };

      const result = ConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.partnerMode).toBe(false);
      }
    });

    it("should default webhookPort to 3100", () => {
      const input = {
        toastClientId: "my_id",
        toastClientSecret: "my_secret",
      };

      const result = ConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.webhookPort).toBe(3100);
      }
    });

    it("should default toastRestaurantGuids to an empty array", () => {
      const input = {
        toastClientId: "my_id",
        toastClientSecret: "my_secret",
      };

      const result = ConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.toastRestaurantGuids).toEqual([]);
      }
    });

    it("should default microsoftBridgeEnabled to false", () => {
      const input = {
        toastClientId: "my_id",
        toastClientSecret: "my_secret",
      };

      const result = ConfigSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.microsoftBridgeEnabled).toBe(false);
      }
    });
  });

  describe("boolean field validation", () => {
    it("should accept true for allowWrites", () => {
      const result = ConfigSchema.safeParse({
        toastClientId: "id",
        toastClientSecret: "secret",
        allowWrites: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allowWrites).toBe(true);
      }
    });

    it("should accept false for dryRun", () => {
      const result = ConfigSchema.safeParse({
        toastClientId: "id",
        toastClientSecret: "secret",
        dryRun: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dryRun).toBe(false);
      }
    });
  });

  describe("invalid logLevel values", () => {
    it("should reject an invalid logLevel", () => {
      const result = ConfigSchema.safeParse({
        toastClientId: "id",
        toastClientSecret: "secret",
        logLevel: "verbose",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear ALL relevant env vars before each test (including ones .env may set)
    const keysToDelete = [
      "TOAST_CLIENT_ID", "TOAST_CLIENT_SECRET",
      "TOAST_RESTAURANT_GUID", "TOAST_RESTAURANT_GUIDS",
      "TOAST_API_HOST", "ALLOW_WRITES", "DRY_RUN",
      "LOG_LEVEL", "PARTNER_MODE", "WEBHOOK_SECRET", "WEBHOOK_PORT",
      "MICROSOFT_TEAMS_WEBHOOK_URL", "MICROSOFT_BRIDGE_ENABLED",
      "MCP_TRANSPORT", "MCP_HTTP_PORT", "MCP_HTTP_HOST",
      "MCP_API_KEY", "ENTRA_ID_TENANT_ID", "ENTRA_ID_CLIENT_ID", "ENTRA_ID_AUDIENCE",
    ];
    for (const key of keysToDelete) {
      delete process.env[key];
    }
    // Prevent .env file from being loaded during tests
    vi.spyOn(process, "cwd").mockReturnValue("/tmp/nonexistent-dir-for-tests");
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe("boolean parsing from environment", () => {
    it("should parse ALLOW_WRITES=true as boolean true", () => {
      process.env.TOAST_CLIENT_ID = "test_id";
      process.env.TOAST_CLIENT_SECRET = "test_secret";
      process.env.ALLOW_WRITES = "true";

      const config = loadConfig();
      expect(config.allowWrites).toBe(true);
    });

    it("should parse ALLOW_WRITES=1 as boolean true", () => {
      process.env.TOAST_CLIENT_ID = "test_id";
      process.env.TOAST_CLIENT_SECRET = "test_secret";
      process.env.ALLOW_WRITES = "1";

      const config = loadConfig();
      expect(config.allowWrites).toBe(true);
    });

    it("should parse ALLOW_WRITES=yes as boolean true", () => {
      process.env.TOAST_CLIENT_ID = "test_id";
      process.env.TOAST_CLIENT_SECRET = "test_secret";
      process.env.ALLOW_WRITES = "yes";

      const config = loadConfig();
      expect(config.allowWrites).toBe(true);
    });

    it("should parse ALLOW_WRITES=false as boolean false", () => {
      process.env.TOAST_CLIENT_ID = "test_id";
      process.env.TOAST_CLIENT_SECRET = "test_secret";
      process.env.ALLOW_WRITES = "false";

      const config = loadConfig();
      expect(config.allowWrites).toBe(false);
    });

    it("should parse DRY_RUN=false as boolean false", () => {
      process.env.TOAST_CLIENT_ID = "test_id";
      process.env.TOAST_CLIENT_SECRET = "test_secret";
      process.env.DRY_RUN = "false";

      const config = loadConfig();
      expect(config.dryRun).toBe(false);
    });

    it("should default DRY_RUN to true when not set", () => {
      process.env.TOAST_CLIENT_ID = "test_id";
      process.env.TOAST_CLIENT_SECRET = "test_secret";

      const config = loadConfig();
      expect(config.dryRun).toBe(true);
    });
  });

  describe("restaurant GUID list parsing", () => {
    it("should parse a comma separated list of GUIDs", () => {
      process.env.TOAST_CLIENT_ID = "test_id";
      process.env.TOAST_CLIENT_SECRET = "test_secret";
      process.env.TOAST_RESTAURANT_GUIDS = "guid-a,guid-b,guid-c";

      const config = loadConfig();
      expect(config.toastRestaurantGuids).toEqual([
        "guid-a",
        "guid-b",
        "guid-c",
      ]);
    });

    it("should trim whitespace around comma separated GUIDs", () => {
      process.env.TOAST_CLIENT_ID = "test_id";
      process.env.TOAST_CLIENT_SECRET = "test_secret";
      process.env.TOAST_RESTAURANT_GUIDS = " guid-a , guid-b , guid-c ";

      const config = loadConfig();
      expect(config.toastRestaurantGuids).toEqual([
        "guid-a",
        "guid-b",
        "guid-c",
      ]);
    });

    it("should fall back to single GUID when GUIDS list is empty", () => {
      process.env.TOAST_CLIENT_ID = "test_id";
      process.env.TOAST_CLIENT_SECRET = "test_secret";
      process.env.TOAST_RESTAURANT_GUID = "single-guid";

      const config = loadConfig();
      expect(config.toastRestaurantGuids).toEqual(["single-guid"]);
    });

    it("should produce an empty array when no GUIDs are set", () => {
      process.env.TOAST_CLIENT_ID = "test_id";
      process.env.TOAST_CLIENT_SECRET = "test_secret";

      const config = loadConfig();
      expect(config.toastRestaurantGuids).toEqual([]);
    });

    it("should filter out empty strings from the GUIDS list", () => {
      process.env.TOAST_CLIENT_ID = "test_id";
      process.env.TOAST_CLIENT_SECRET = "test_secret";
      process.env.TOAST_RESTAURANT_GUIDS = "guid-a,,guid-b,,,guid-c";

      const config = loadConfig();
      expect(config.toastRestaurantGuids).toEqual([
        "guid-a",
        "guid-b",
        "guid-c",
      ]);
    });
  });

  describe("validation errors", () => {
    it("should throw on missing TOAST_CLIENT_ID", () => {
      process.env.TOAST_CLIENT_SECRET = "test_secret";

      expect(() => loadConfig()).toThrow("Configuration validation failed");
    });

    it("should throw on missing TOAST_CLIENT_SECRET", () => {
      process.env.TOAST_CLIENT_ID = "test_id";

      expect(() => loadConfig()).toThrow("Configuration validation failed");
    });

    it("should include a hint about .env.example in the error", () => {
      expect(() => loadConfig()).toThrow(".env.example");
    });
  });
});
