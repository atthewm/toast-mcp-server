import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ToastAuth } from "../../src/toast/auth.js";
import { AuthenticationError } from "../../src/utils/errors.js";
import { mockTokenResponse } from "../fixtures/api-responses.js";

describe("ToastAuth", () => {
  const CLIENT_ID = "test-client-id";
  const CLIENT_SECRET = "test-client-secret";
  const API_HOST = "https://ws-api.toasttab.com";

  let auth: ToastAuth;

  beforeEach(() => {
    auth = new ToastAuth(CLIENT_ID, CLIENT_SECRET, API_HOST);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetchSuccess(responseBody = mockTokenResponse) {
    return vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  describe("token acquisition via fetch", () => {
    it("should acquire a token by calling the Toast auth endpoint", async () => {
      const fetchSpy = mockFetchSuccess();

      const token = await auth.getToken();

      expect(token).toBe("mock-access-token-abc123");
      expect(fetchSpy).toHaveBeenCalledOnce();

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe(
        "https://ws-api.toasttab.com/authentication/v1/authentication/login"
      );
      expect(options?.method).toBe("POST");

      const body = JSON.parse(options?.body as string);
      expect(body.clientId).toBe(CLIENT_ID);
      expect(body.clientSecret).toBe(CLIENT_SECRET);
      expect(body.userAccessType).toBe("TOAST_MACHINE_CLIENT");
    });

    it("should include Content-Type application/json in the request", async () => {
      const fetchSpy = mockFetchSuccess();

      await auth.getToken();

      const [, options] = fetchSpy.mock.calls[0];
      const headers = options?.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
    });
  });

  describe("token caching", () => {
    it("should return the cached token on subsequent calls", async () => {
      const fetchSpy = mockFetchSuccess();

      const token1 = await auth.getToken();
      const token2 = await auth.getToken();

      expect(token1).toBe(token2);
      expect(fetchSpy).toHaveBeenCalledOnce();
    });

    it("should report a valid token after acquisition", async () => {
      mockFetchSuccess();

      expect(auth.hasValidToken()).toBe(false);

      await auth.getToken();

      expect(auth.hasValidToken()).toBe(true);
    });

    it("should clear the cached token when clearToken is called", async () => {
      mockFetchSuccess();

      await auth.getToken();
      expect(auth.hasValidToken()).toBe(true);

      auth.clearToken();
      expect(auth.hasValidToken()).toBe(false);
    });
  });

  describe("token refresh on expiry", () => {
    it("should re-acquire a token when the cached one has expired", async () => {
      const fetchSpy = mockFetchSuccess({
        token: {
          ...mockTokenResponse.token,
          // Set expiresIn to 30 so the token expires immediately
          // (the 60 second buffer means it will be considered expired)
          expiresIn: 30,
        },
        status: "SUCCESS",
      });

      await auth.getToken();

      // Advance time past expiry (the buffer is 60 seconds, token says 30 seconds)
      vi.spyOn(Date, "now").mockReturnValue(Date.now() + 120_000);

      await auth.getToken();

      // Should have called fetch twice: once for initial, once for refresh
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it("should force refresh via refreshToken regardless of cache", async () => {
      const fetchSpy = mockFetchSuccess();

      await auth.getToken();
      await auth.refreshToken();

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("auth failure handling", () => {
    it("should throw AuthenticationError on HTTP 401", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Unauthorized", { status: 401 })
      );

      await expect(auth.getToken()).rejects.toThrow(AuthenticationError);
    });

    it("should throw AuthenticationError on HTTP 403", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Forbidden", { status: 403 })
      );

      await expect(auth.getToken()).rejects.toThrow(AuthenticationError);
    });

    it("should include the HTTP status code in the error details", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Bad creds", { status: 401 })
      );

      try {
        await auth.getToken();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(AuthenticationError);
        const authErr = err as AuthenticationError;
        expect(authErr.details?.status).toBe(401);
      }
    });

    it("should throw AuthenticationError when fetch rejects (network error)", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new TypeError("Network request failed")
      );

      await expect(auth.getToken()).rejects.toThrow(AuthenticationError);
    });

    it("should throw AuthenticationError when response is missing accessToken", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
        new Response(JSON.stringify({ tokenType: "Bearer", expiresIn: 3600 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      try {
        await auth.getToken();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(AuthenticationError);
        expect((err as Error).message).toContain("missing accessToken");
      }
    });
  });
});
