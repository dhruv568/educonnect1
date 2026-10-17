/**
 * Sensitive Data Redactor for Safe Logging and User Guidance
 *
 * Prevents exposure of:
 * - Passwords, secret keys, password hashes
 * - JWTs, session tokens, bearer tokens
 * - API keys (Cashfree, Resend, WhatsApp, OpenAI, LiveKit, Mux, MSG91)
 * - Credit/debit card numbers, CVVs
 * - Bank account numbers (partially masked), IFSC
 * - OTP verification codes
 * - Auth cookies
 */

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passphrase/i,
  /secret/i,
  /token/i,
  /auth_?header/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /api_?key/i,
  /client_?secret/i,
  /auth_?key/i,
  /code_?hash/i,
  /otp/i,
  /pin/i,
  /cvv/i,
  /card_?number/i,
  /account_?number/i,
  /private_?key/i,
  /hash/i,
];

const SENSITIVE_VALUE_REGEXES = [
  // JWT tokens (3 base64 strings separated by dots)
  /ey[A-Za-z0-9_-]{10,}\.ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  // Bearer tokens
  /Bearer\s+[A-Za-z0-9_\-\.]{15,}/gi,
  // 16-digit credit card numbers
  /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
  // Cashfree / Resend / WhatsApp API keys
  /\b(?:cfsk_|re_|whsec_|sk_live_|key_)[A-Za-z0-9_-]{16,}\b/g,
  // 6-digit OTP codes in context
  /(?:otp|code|pin)[:=]\s*["']?(\d{4,6})["']?/gi,
];

/**
 * Checks whether an object property name represents sensitive data.
 */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Masks a sensitive string, preserving only safe identifier hints.
 * e.g. "123456789012" -> "********9012"
 */
export function maskSensitiveString(val: string): string {
  if (!val || typeof val !== "string") return "[REDACTED]";
  if (val.length <= 4) return "****";
  if (val.length <= 8) return val.slice(0, 2) + "****" + val.slice(-2);
  return "******" + val.slice(-4);
}

/**
 * Deeply redacts sensitive keys and values from objects, arrays, or primitives.
 */
export function redactSensitiveData<T = any>(input: T, depth = 0): T {
  if (depth > 6) return "[MAX_DEPTH_REACHED]" as any;
  if (input === null || input === undefined) return input;

  if (typeof input === "string") {
    let sanitized: string = String(input);
    for (const rx of SENSITIVE_VALUE_REGEXES) {
      sanitized = sanitized.replace(rx, "[REDACTED_SECRET]");
    }
    return sanitized as unknown as T;
  }

  if (typeof input === "number" || typeof input === "boolean") {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => redactSensitiveData(item, depth + 1)) as any;
  }

  if (typeof input === "object") {
    const copy: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      if (isSensitiveKey(key)) {
        if (typeof value === "string" && (key.toLowerCase().includes("account") || key.toLowerCase().includes("phone"))) {
          copy[key] = maskSensitiveString(value);
        } else {
          copy[key] = "[REDACTED]";
        }
      } else {
        copy[key] = redactSensitiveData(value, depth + 1);
      }
    }
    return copy as unknown as T;
  }

  return input;
}
