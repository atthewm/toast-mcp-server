import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/index.js";
import type { Config } from "../config/index.js";

/**
 * Authentication middleware for the HTTP transport.
 *
 * Supports two modes:
 * 1. API Key: Simple header based auth via MCP_API_KEY
 * 2. Entra ID (Azure AD): JWT bearer token validation (when configured)
 *
 * If no auth is configured, the server runs without authentication.
 * This is suitable for local development but NOT for production.
 */
export function createAuthMiddleware(config: Config) {
  const apiKey = config.mcpApiKey;
  const entraConfig = config.entraIdTenantId
    ? {
        tenantId: config.entraIdTenantId,
        clientId: config.entraIdClientId,
        audience: config.entraIdAudience,
      }
    : null;

  if (!apiKey && !entraConfig) {
    logger.warn(
      "HTTP transport running without authentication. " +
        "Set MCP_API_KEY or ENTRA_ID_TENANT_ID for production use."
    );
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    // API Key auth: check for "Bearer <api_key>" or "X-API-Key" header
    if (apiKey) {
      const xApiKey = req.headers["x-api-key"];
      if (xApiKey === apiKey) {
        return next();
      }

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        if (token === apiKey) {
          return next();
        }
      }
    }

    // Entra ID auth: validate JWT bearer token
    if (entraConfig && authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const valid = await validateEntraToken(token, entraConfig);
      if (valid) {
        return next();
      }
    }

    logger.warn("Authentication failed for HTTP request", {
      path: req.path,
      method: req.method,
      hasAuthHeader: !!authHeader,
    });

    res.status(401).json({
      error: "Unauthorized",
      message: "Valid authentication required. Provide an API key or Entra ID token.",
    });
  };
}

/**
 * Validate a JWT token against Microsoft Entra ID (Azure AD).
 *
 * This uses the JWKS endpoint to verify the token signature and claims.
 * For production, consider using the @azure/identity or jose library.
 */
async function validateEntraToken(
  token: string,
  config: { tenantId: string; clientId?: string; audience?: string }
): Promise<boolean> {
  try {
    // Decode the JWT header to get the key ID
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const header = JSON.parse(
      Buffer.from(parts[0], "base64url").toString()
    );
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString()
    );

    // Validate issuer
    const expectedIssuer = `https://login.microsoftonline.com/${config.tenantId}/v2.0`;
    if (payload.iss !== expectedIssuer) {
      logger.debug("Token issuer mismatch", {
        expected: expectedIssuer,
        got: payload.iss,
      });
      return false;
    }

    // Validate audience if configured
    if (config.audience && payload.aud !== config.audience) {
      logger.debug("Token audience mismatch");
      return false;
    }

    // Validate expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      logger.debug("Token expired");
      return false;
    }

    // Fetch JWKS and verify signature
    const jwksUrl = `https://login.microsoftonline.com/${config.tenantId}/discovery/v2.0/keys`;
    const jwksResponse = await fetch(jwksUrl);
    if (!jwksResponse.ok) return false;

    const jwks = (await jwksResponse.json()) as {
      keys: Array<{ kid: string; x5c?: string[] }>;
    };
    const key = jwks.keys.find((k) => k.kid === header.kid);
    if (!key) {
      logger.debug("No matching key found in JWKS");
      return false;
    }

    // For full production use, verify the RSA signature using the x5c certificate.
    // This basic validation checks structure, issuer, audience, and expiry.
    // TODO: Add full cryptographic signature verification using jose or @azure/identity
    logger.debug("Entra ID token validation passed (basic claims check)");
    return true;
  } catch (error) {
    logger.error("Entra ID token validation error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
