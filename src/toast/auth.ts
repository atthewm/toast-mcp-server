import { logger, AuthenticationError } from "../utils/index.js";

interface TokenResponse {
  // Toast wraps the token in a nested object
  token?: {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
  };
  // Also support flat format (some endpoints/versions)
  accessToken?: string;
  tokenType?: string;
  expiresIn?: number;
  status?: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

/**
 * Manages OAuth client credentials authentication with the Toast API.
 * Handles token acquisition, caching, and automatic refresh.
 */
export class ToastAuth {
  private cachedToken: CachedToken | null = null;
  // Refresh 60 seconds before actual expiry to avoid edge cases
  private static TOKEN_REFRESH_BUFFER_MS = 60_000;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly apiHost: string
  ) {}

  /**
   * Get a valid access token. Returns cached token if still valid,
   * otherwise acquires a new one.
   */
  async getToken(): Promise<string> {
    if (this.cachedToken && !this.isExpired(this.cachedToken)) {
      logger.debug("Using cached auth token");
      return this.cachedToken.accessToken;
    }

    logger.info("Acquiring new Toast auth token");
    return this.refreshToken();
  }

  /**
   * Force refresh the token regardless of cache state.
   * Useful for retrying after a 401.
   */
  async refreshToken(): Promise<string> {
    const url = `${this.apiHost}/authentication/v1/authentication/login`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          userAccessType: "TOAST_MACHINE_CLIENT",
        }),
      });
    } catch (error) {
      throw new AuthenticationError(
        `Failed to reach Toast auth endpoint: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new AuthenticationError(
        `Toast authentication failed with status ${response.status}`,
        { status: response.status, body }
      );
    }

    const data = (await response.json()) as TokenResponse;

    // Handle both nested (real API) and flat response formats
    const accessToken = data.token?.accessToken ?? data.accessToken;
    const expiresIn = data.token?.expiresIn ?? data.expiresIn;

    if (!accessToken) {
      throw new AuthenticationError(
        "Toast auth response missing accessToken field"
      );
    }

    if (!expiresIn) {
      throw new AuthenticationError(
        "Toast auth response missing expiresIn field"
      );
    }

    this.cachedToken = {
      accessToken,
      expiresAt:
        Date.now() +
        expiresIn * 1000 -
        ToastAuth.TOKEN_REFRESH_BUFFER_MS,
    };

    logger.info("Toast auth token acquired", {
      expiresIn,
    });

    return this.cachedToken.accessToken;
  }

  /**
   * Check whether the current token is valid without making a request.
   */
  hasValidToken(): boolean {
    return this.cachedToken !== null && !this.isExpired(this.cachedToken);
  }

  /**
   * Clear the cached token.
   */
  clearToken(): void {
    this.cachedToken = null;
  }

  private isExpired(token: CachedToken): boolean {
    return Date.now() >= token.expiresAt;
  }
}
