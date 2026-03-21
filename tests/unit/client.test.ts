import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ToastClient } from "../../src/toast/client.js";
import { ApiRequestError, AuthenticationError } from "../../src/utils/errors.js";
import {
  createMockConfig,
  mockTokenResponse,
} from "../fixtures/api-responses.js";

describe("ToastClient", () => {
  let client: ToastClient;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  /**
   * Helper: returns a mock fetch that first responds with a valid auth token,
   * then responds with the given api response body and status.
   */
  function setupFetchMock(
    apiBody: unknown = { ok: true },
    apiStatus = 200,
    options?: { authBody?: unknown }
  ) {
    const authResponse = new Response(
      JSON.stringify(options?.authBody ?? mockTokenResponse),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

    const apiResponse = new Response(JSON.stringify(apiBody), {
      status: apiStatus,
      headers: { "Content-Type": "application/json" },
    });

    // First call is always auth, subsequent calls are api
    fetchSpy = vi.spyOn(globalThis, "fetch");
    let callCount = 0;
    fetchSpy.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return authResponse.clone();
      return apiResponse.clone();
    });

    return fetchSpy;
  }

  /**
   * Helper: creates a fetch mock that returns different responses for each call.
   * Each entry is [status, body]. The first call is assumed to be auth.
   */
  function setupMultiResponseFetch(
    ...responses: Array<[number, unknown]>
  ) {
    fetchSpy = vi.spyOn(globalThis, "fetch");
    let callIndex = 0;
    fetchSpy.mockImplementation(async () => {
      const [status, body] = responses[callIndex] ?? [500, { error: "no more mock responses" }];
      callIndex++;
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    });
    return fetchSpy;
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new ToastClient(createMockConfig());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("request building with auth headers", () => {
    it("should include a Bearer token in the Authorization header", async () => {
      const spy = setupFetchMock({ menus: [] });

      await client.get("/menus/v2/menus");

      // Second call is the actual API request
      const [, options] = spy.mock.calls[1];
      const headers = options?.headers as Record<string, string>;
      expect(headers["Authorization"]).toBe(
        `Bearer ${mockTokenResponse.token.accessToken}`
      );
    });

    it("should include Content-Type application/json", async () => {
      const spy = setupFetchMock({ data: "test" });

      await client.get("/test/path");

      const [, options] = spy.mock.calls[1];
      const headers = options?.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("should build the full URL from the API host and path", async () => {
      const spy = setupFetchMock({ result: true });

      await client.get("/restaurants/v1/restaurants");

      const [url] = spy.mock.calls[1];
      expect(url).toBe(
        "https://ws-api.toasttab.com/restaurants/v1/restaurants"
      );
    });

    it("should append query params to the URL", async () => {
      const spy = setupFetchMock({ results: [] });

      await client.get("/orders/v2/orders", {
        businessDate: "20260321",
        pageSize: 50,
      });

      const [url] = spy.mock.calls[1];
      const parsed = new URL(url as string);
      expect(parsed.searchParams.get("businessDate")).toBe("20260321");
      expect(parsed.searchParams.get("pageSize")).toBe("50");
    });

    it("should skip undefined query params", async () => {
      const spy = setupFetchMock({ results: [] });

      await client.get("/orders/v2/orders", {
        businessDate: "20260321",
        unused: undefined,
      });

      const [url] = spy.mock.calls[1];
      const parsed = new URL(url as string);
      expect(parsed.searchParams.has("unused")).toBe(false);
    });
  });

  describe("restaurant GUID header", () => {
    it("should include the restaurant external ID header when a GUID is configured", async () => {
      const spy = setupFetchMock({ info: {} });

      await client.get("/restaurants/v1/restaurants");

      const [, options] = spy.mock.calls[1];
      const headers = options?.headers as Record<string, string>;
      expect(headers["Toast-Restaurant-External-ID"]).toBe(
        "c227349d-7778-4ec2-af27-e386eb2ec52e"
      );
    });

    it("should use a provided restaurant GUID override", async () => {
      const spy = setupFetchMock({ info: {} });

      await client.get("/restaurants/v1/restaurants", undefined, "override-guid");

      const [, options] = spy.mock.calls[1];
      const headers = options?.headers as Record<string, string>;
      expect(headers["Toast-Restaurant-External-ID"]).toBe("override-guid");
    });

    it("should not include the header when no GUID is available", async () => {
      const noGuidClient = new ToastClient(
        createMockConfig({
          toastRestaurantGuid: undefined,
          toastRestaurantGuids: [],
        })
      );

      const spy = setupFetchMock({ info: {} });

      await noGuidClient.get("/test");

      const [, options] = spy.mock.calls[1];
      const headers = options?.headers as Record<string, string>;
      expect(headers["Toast-Restaurant-External-ID"]).toBeUndefined();
    });
  });

  describe("retry on 5xx", () => {
    it("should retry on a 500 response and succeed on the next attempt", async () => {
      const spy = setupMultiResponseFetch(
        [200, mockTokenResponse],         // auth
        [500, { error: "server error" }], // first API call fails
        [200, { data: "recovered" }]      // retry succeeds
      );

      const result = await client.get<{ data: string }>("/test/retry");
      expect(result.data).toBe("recovered");
      // Should be 3 calls total: auth, failed api, retry api
      expect(spy).toHaveBeenCalledTimes(3);
    });

    it("should retry on a 429 rate limit response", async () => {
      const spy = setupMultiResponseFetch(
        [200, mockTokenResponse],            // auth
        [429, { error: "too many" }],        // rate limited
        [200, { data: "after rate limit" }]  // retry succeeds
      );

      const result = await client.get<{ data: string }>("/test/rate");
      expect(result.data).toBe("after rate limit");
      expect(spy).toHaveBeenCalledTimes(3);
    });

    it("should throw after exhausting all retries on persistent 5xx", async () => {
      setupMultiResponseFetch(
        [200, mockTokenResponse],
        [503, { error: "unavailable" }],
        [503, { error: "unavailable" }],
        [503, { error: "unavailable" }]
      );

      await expect(client.get("/test/fail")).rejects.toThrow(ApiRequestError);
    });
  });

  describe("non-retryable errors", () => {
    it("should throw immediately on a 400 error without retrying", async () => {
      const spy = setupMultiResponseFetch(
        [200, mockTokenResponse],
        [400, { error: "bad request" }]
      );

      await expect(client.get("/test/bad")).rejects.toThrow(ApiRequestError);
      // Only 2 calls: auth and the failed request (no retry)
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("should throw immediately on a 404 error without retrying", async () => {
      const spy = setupMultiResponseFetch(
        [200, mockTokenResponse],
        [404, { error: "not found" }]
      );

      await expect(client.get("/test/missing")).rejects.toThrow(ApiRequestError);
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe("timeout handling", () => {
    it("should abort the request when the timeout is exceeded", async () => {
      // Mock auth first
      let callCount = 0;
      fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
        async (_url, options) => {
          callCount++;
          if (callCount === 1) {
            // Auth response
            return new Response(JSON.stringify(mockTokenResponse), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
          // Simulate a slow response by waiting for abort
          return new Promise<Response>((_resolve, reject) => {
            const signal = options?.signal;
            if (signal) {
              signal.addEventListener("abort", () => {
                const abortError = new DOMException(
                  "The operation was aborted",
                  "AbortError"
                );
                reject(abortError);
              });
            }
          });
        }
      );

      // Use a very short timeout to trigger abort
      await expect(
        client.request({ path: "/slow/endpoint", timeoutMs: 1 })
      ).rejects.toThrow();
    });
  });

  describe("401 triggers token refresh", () => {
    it("should refresh the token and retry on a 401 response", async () => {
      const freshToken = "refreshed-token-xyz";
      let callCount = 0;

      fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        callCount++;
        const urlStr = url instanceof URL ? url.toString() : String(url);

        // Auth calls
        if (urlStr.includes("/authentication/")) {
          return new Response(
            JSON.stringify({
              ...mockTokenResponse,
              accessToken:
                callCount <= 1
                  ? mockTokenResponse.accessToken
                  : freshToken,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        // First API call returns 401, subsequent calls succeed
        if (callCount <= 2) {
          return new Response("Unauthorized", { status: 401 });
        }

        return new Response(JSON.stringify({ data: "success" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const result = await client.get<{ data: string }>("/test/auth-retry");
      expect(result.data).toBe("success");
    });
  });

  describe("convenience methods", () => {
    it("should send a POST request with the given body", async () => {
      const spy = setupFetchMock({ created: true });

      await client.post("/orders/v2/orders", { entityType: "Order" });

      const [, options] = spy.mock.calls[1];
      expect(options?.method).toBe("POST");
      const body = JSON.parse(options?.body as string);
      expect(body.entityType).toBe("Order");
    });

    it("should send a PATCH request with the given body", async () => {
      const spy = setupFetchMock({ updated: true });

      await client.patch("/orders/v2/orders/guid-123", { voided: true });

      const [, options] = spy.mock.calls[1];
      expect(options?.method).toBe("PATCH");
      const body = JSON.parse(options?.body as string);
      expect(body.voided).toBe(true);
    });
  });

  describe("utility methods", () => {
    it("should return configured restaurant GUIDs", () => {
      expect(client.getRestaurantGuids()).toEqual([
        "c227349d-7778-4ec2-af27-e386eb2ec52e",
      ]);
    });

    it("should return the default restaurant GUID", () => {
      expect(client.getDefaultRestaurantGuid()).toBe(
        "c227349d-7778-4ec2-af27-e386eb2ec52e"
      );
    });

    it("should return a copy of restaurant GUIDs (not the internal array)", () => {
      const guids1 = client.getRestaurantGuids();
      const guids2 = client.getRestaurantGuids();
      expect(guids1).toEqual(guids2);
      expect(guids1).not.toBe(guids2);
    });

    it("should verify auth successfully when token acquisition works", async () => {
      setupFetchMock();
      const result = await client.verifyAuth();
      expect(result).toBe(true);
    });

    it("should return false from verifyAuth when auth fails", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("Connection refused")
      );

      const result = await client.verifyAuth();
      expect(result).toBe(false);
    });
  });
});
