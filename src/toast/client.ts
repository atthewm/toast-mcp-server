import { ToastAuth } from "./auth.js";
import { logger, ApiRequestError, AuthenticationError } from "../utils/index.js";
import type { Config } from "../config/index.js";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  restaurantGuid?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}

/**
 * Reusable Toast API client with authentication, retries, and error handling.
 * All Toast API calls should go through this client.
 */
export class ToastClient {
  private readonly auth: ToastAuth;
  private readonly apiHost: string;
  private readonly defaultRestaurantGuid: string | undefined;
  private readonly restaurantGuids: string[];
  private static MAX_RETRIES = 3;
  private static RETRY_BASE_MS = 1000;
  private static DEFAULT_TIMEOUT_MS = 30_000;

  constructor(config: Config) {
    this.auth = new ToastAuth(
      config.toastClientId,
      config.toastClientSecret,
      config.toastApiHost
    );
    this.apiHost = config.toastApiHost;
    this.defaultRestaurantGuid = config.toastRestaurantGuid;
    this.restaurantGuids = config.toastRestaurantGuids;
  }

  /**
   * Make an authenticated request to the Toast API.
   */
  async request<T = unknown>(options: RequestOptions): Promise<T> {
    const {
      method = "GET",
      path,
      body,
      params,
      timeoutMs = ToastClient.DEFAULT_TIMEOUT_MS,
    } = options;

    const restaurantGuid =
      options.restaurantGuid ?? this.defaultRestaurantGuid;

    const url = this.buildUrl(path, params);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < ToastClient.MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay =
          ToastClient.RETRY_BASE_MS * Math.pow(2, attempt - 1);
        logger.debug(`Retrying request (attempt ${attempt + 1})`, {
          delay,
          path,
        });
        await this.sleep(delay);
      }

      try {
        const token = await this.auth.getToken();

        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        if (restaurantGuid) {
          headers["Toast-Restaurant-External-ID"] = restaurantGuid;
        }

        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          timeoutMs
        );

        let response: Response;
        try {
          response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        // Handle auth failures by refreshing token and retrying
        if (response.status === 401 && attempt < ToastClient.MAX_RETRIES - 1) {
          logger.warn("Got 401, refreshing token and retrying");
          this.auth.clearToken();
          await this.auth.refreshToken();
          continue;
        }

        if (!response.ok) {
          const responseBody = await response.text().catch(() => "");
          throw new ApiRequestError(
            `Toast API ${method} ${path} returned ${response.status}`,
            response.status,
            {
              path,
              status: response.status,
              body: responseBody.slice(0, 500),
            }
          );
        }

        // Some endpoints return 204 with no body
        if (response.status === 204) {
          return undefined as T;
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Only retry on transient errors
        if (error instanceof ApiRequestError) {
          const status = error.statusCode ?? 0;
          if (status >= 500 || status === 429) {
            continue;
          }
          throw error;
        }

        if (error instanceof AuthenticationError) {
          throw error;
        }

        // Retry on network errors
        if (
          error instanceof TypeError ||
          (error instanceof Error && error.name === "AbortError")
        ) {
          continue;
        }

        throw error;
      }
    }

    throw (
      lastError ??
      new ApiRequestError("Request failed after retries", 0)
    );
  }

  /**
   * Convenience method for GET requests.
   */
  async get<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    restaurantGuid?: string
  ): Promise<T> {
    return this.request<T>({
      method: "GET",
      path,
      params,
      restaurantGuid,
    });
  }

  /**
   * Convenience method for POST requests.
   */
  async post<T = unknown>(
    path: string,
    body?: unknown,
    restaurantGuid?: string
  ): Promise<T> {
    return this.request<T>({
      method: "POST",
      path,
      body,
      restaurantGuid,
    });
  }

  /**
   * Convenience method for PATCH requests.
   */
  async patch<T = unknown>(
    path: string,
    body?: unknown,
    restaurantGuid?: string
  ): Promise<T> {
    return this.request<T>({
      method: "PATCH",
      path,
      body,
      restaurantGuid,
    });
  }

  /**
   * Verify that authentication works.
   */
  async verifyAuth(): Promise<boolean> {
    try {
      await this.auth.getToken();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the configured restaurant GUIDs.
   */
  getRestaurantGuids(): string[] {
    return [...this.restaurantGuids];
  }

  /**
   * Get the default restaurant GUID.
   */
  getDefaultRestaurantGuid(): string | undefined {
    return this.defaultRestaurantGuid;
  }

  /**
   * Check if a valid auth token exists.
   */
  hasValidToken(): boolean {
    return this.auth.hasValidToken();
  }

  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    const url = new URL(path, this.apiHost);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
