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
  const candidates = [
    process.env.AUTH_SECRET,
    process.env.SESSION_SECRET,
    process.env.JWT_SECRET,
  ].filter((s): s is string => Boolean(s && typeof s === "string" && s.trim().length > 0));

  if (process.env.NODE_ENV === "production") {
    const validSecret = candidates.find((s) => !INSECURE_FALLBACK_SECRETS.has(s));
    if (!validSecret) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: A secure, unique AUTH_SECRET, SESSION_SECRET, or JWT_SECRET must be configured in production environments. Insecure fallback or default placeholder secrets are strictly disallowed."
      );
    }
    return validSecret;
  }

  return candidates[0] || "educonnects_super_secret_session_key_2026";
}

function rotr(n: number, b: number) {
  return (n >>> b) | (n << (32 - b));
}

function sha256(ascii: Uint8Array): Uint8Array {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const l = ascii.length;
  const bitLen = l * 8;
  const padLen = l % 64 < 56 ? 56 - (l % 64) : 120 - (l % 64);
  const totalLen = l + padLen + 8;
  const padded = new Uint8Array(totalLen);
  padded.set(ascii);
  padded[l] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(totalLen - 4, bitLen >>> 0);
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000));

  const W = new Int32Array(64);
  for (let i = 0; i < totalLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getInt32(i + t * 4);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (((W[t - 16] + s0) | 0) + ((W[t - 7] + s1) | 0)) | 0;
    }

    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (((((h + S1) | 0) + ch) | 0) + ((K[t] + W[t]) | 0)) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }

    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) {
    outView.setInt32(i * 4, H[i]);
  }
  return out;
}

/**
 * Edge-compatible pure TypeScript HMAC-SHA256 calculation.
 */
function computeHmacSha256(keyStr: string, msgStr: string): string {
  const enc = new TextEncoder();
  const rawKey = enc.encode(keyStr);
  const msg = enc.encode(msgStr);

  const blockLen = 64;
  const key = rawKey.length > blockLen ? sha256(rawKey) : rawKey;
  const paddedKey = new Uint8Array(blockLen);
  paddedKey.set(key);

  const iPad = new Uint8Array(blockLen);
  const oPad = new Uint8Array(blockLen);
  for (let i = 0; i < blockLen; i++) {
    iPad[i] = paddedKey[i] ^ 0x36;
    oPad[i] = paddedKey[i] ^ 0x5c;
  }

  const inner = new Uint8Array(blockLen + msg.length);
  inner.set(iPad);
  inner.set(msg, blockLen);
  const innerHash = sha256(inner);

  const outer = new Uint8Array(blockLen + 32);
  outer.set(oPad);
  outer.set(innerHash, blockLen);
  const outerHash = sha256(outer);

  let bin = "";
  for (let i = 0; i < outerHash.length; i++) bin += String.fromCharCode(outerHash[i]);
  return Buffer.from(bin, "binary").toString("base64url");
}

/**
 * Performs a timing-safe equality check between two strings to mitigate timing attacks.
 * Native Edge-compatible constant-time comparison without importing Node.js crypto.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generates an HMAC-SHA256 signature encoded as base64url.
 * Edge Runtime and Node.js compatible.
 */
export function computeSignature(data: string, secret?: string): string {
  const resolvedSecret = secret || getSigningSecret();
  return computeHmacSha256(resolvedSecret, data);
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
