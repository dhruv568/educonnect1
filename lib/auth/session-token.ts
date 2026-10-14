import crypto from "crypto";
import { UserSession } from "@/types/auth";

const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

const INSECURE_FALLBACK_SECRETS = new Set([
  "educonnects_super_secret_session_key_2026",
  "educonnects_super_secret_session_key_2026_change_in_production",
]);

/**
 * Resolves the server-side signing secret.
 * Prioritizes AUTH_SECRET, then SESSION_SECRET, then JWT_SECRET.
 * In production (process.env.NODE_ENV === "production"), an explicit, secure secret
 * is strictly required. Silent fallback to an insecure hardcoded key is prohibited.
 */
export function getSigningSecret(): string {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET;

  if (process.env.NODE_ENV === "production") {
    if (!secret || INSECURE_FALLBACK_SECRETS.has(secret)) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: A secure, unique AUTH_SECRET, SESSION_SECRET, or JWT_SECRET must be configured in production environments. Insecure fallback or default placeholder secrets are strictly disallowed."
      );
    }
    return secret;
  }

  return secret || "educonnects_super_secret_session_key_2026";
}

/**
 * Performs a timing-safe equality check between two strings to mitigate timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generates an HMAC-SHA256 signature encoded as base64url.
 */
export function computeSignature(data: string, secret?: string): string {
  const resolvedSecret = secret || getSigningSecret();
  return crypto
    .createHmac("sha256", resolvedSecret)
    .update(data)
    .digest("base64url");
}

/**
 * Encodes and cryptographically signs a UserSession payload.
 * Produces a signed token string in the format: `${base64urlData}.${base64urlSignature}`
 */
export function encodeSession(session: UserSession): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = nowSeconds + SESSION_DURATION_SECONDS;

  const payload: UserSession & { iat: number; exp: number } = {
    ...session,
    id: session.id || session.userId || "",
    userId: session.userId || session.id || "",
    iat: nowSeconds,
    exp: expiresAt,
  };

  const jsonStr = JSON.stringify(payload);
  const base64Data = Buffer.from(jsonStr).toString("base64url");
  const signature = computeSignature(base64Data);

  return `${base64Data}.${signature}`;
}

/**
 * Decodes and cryptographically verifies a signed session token.
 * 
 * Security guarantees:
 * 1. Forged or unsigned tokens are strictly rejected (returns null).
 * 2. Tampered payloads or altered roles are strictly rejected (returns null).
 * 3. Expired tokens are rejected (returns null).
 * 4. Timing attacks are mitigated using crypto.timingSafeEqual.
 */
export function decodeSession(token: string): UserSession | null {
  if (!token || typeof token !== "string") {
    return null;
  }

  const trimmed = token.trim();
  const parts = trimmed.split(".");

  // Unsigned tokens or tokens lacking a signature component are strictly rejected.
  // There is NO fallback to unauthenticated payloads.
  if (parts.length !== 2) {
    return null;
  }

  const [base64Data, signature] = parts;
  if (!base64Data || !signature) {
    return null;
  }

  try {
    const expectedSignature = computeSignature(base64Data);
    if (!timingSafeEqual(signature, expectedSignature)) {
      return null;
    }

    const jsonStr = Buffer.from(base64Data, "base64url").toString("utf-8");
    const payload = JSON.parse(jsonStr) as UserSession & { iat?: number; exp?: number; expiresAt?: number };

    if (!payload || typeof payload !== "object") {
      return null;
    }

    // Expiration check
    const exp = payload.exp || payload.expiresAt;
    if (typeof exp === "number") {
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (nowSeconds > exp) {
        return null;
      }
    }

    // Normalize IDs
    payload.userId = payload.userId || payload.id;
    payload.id = payload.id || payload.userId;

    return payload;
  } catch (err: any) {
    if (err?.message?.includes("FATAL SECURITY CONFIGURATION")) {
      console.error("[CRITICAL AUTHENTICATION CONFIGURATION ERROR]:", err.message);
    }
    return null;
  }
}
