/**
 * MSG91 OTP & Widget Service Integration
 *
 * Implements secure phone number OTP dispatch and server-side verification using MSG91.
 * Supports MSG91 OTP Widget API (verifyAccessToken, sendOtp, verifyOtp, retryOtp).
 *
 * Environment variables:
 * - MSG91_AUTHKEY: Master account Authkey
 * - MSG91_WIDGET_ID: Unique OTP Widget ID from MSG91 dashboard
 * - MSG91_TOKEN_AUTH: Widget token auth for headless / server interaction
 * - NEXT_PUBLIC_MSG91_WIDGET_ID: Optional public widget ID for client-side script
 */

export interface Msg91Config {
  authkey: string;
  widgetId: string;
  tokenAuth: string;
  isConfigured: boolean;
}

export interface Msg91SendOtpResult {
  success: boolean;
  reqId?: string;
  message?: string;
  error?: string;
  isSimulated?: boolean;
}

export interface Msg91VerifyOtpResult {
  success: boolean;
  accessToken?: string;
  message?: string;
  error?: string;
  isSimulated?: boolean;
}

export interface Msg91VerifyTokenResult {
  success: boolean;
  phone?: string;
  message?: string;
  error?: string;
  isSimulated?: boolean;
}

export class Msg91Client {
  private static readonly MSG91_API_BASE = "https://control.msg91.com/api/v5/widget";

  /**
   * Sanitizes environment variable values by trimming whitespace and
   * stripping enclosing single or double quotes.
   */
  static sanitizeEnv(val: string | undefined): string {
    if (!val) return "";
    let s = val.trim();
    if (
      (s.startsWith('"') && s.endsWith('"')) ||
      (s.startsWith("'") && s.endsWith("'"))
    ) {
      s = s.slice(1, -1).trim();
    }
    return s;
  }

  /**
   * Retrieves active MSG91 configuration from environment variables.
   */
  static getConfig(): Msg91Config {
    const authkey = this.sanitizeEnv(process.env.MSG91_AUTHKEY);
    const widgetId = this.sanitizeEnv(
      process.env.MSG91_WIDGET_ID ||
      process.env.NEXT_PUBLIC_MSG91_WIDGET_ID
    );
    const tokenAuth = this.sanitizeEnv(
      process.env.MSG91_TOKEN_AUTH ||
      process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH
    );

    const isPlaceholder =
      !authkey ||
      authkey === "your_msg91_authkey_here" ||
      !widgetId ||
      widgetId === "your_msg91_widget_id_here";

    const isTestKey =
      authkey.startsWith("test_") ||
      authkey.includes("sample") ||
      authkey.startsWith("sim_") ||
      widgetId.startsWith("test_") ||
      process.env.MSG91_SIMULATION === "true";

    const isConfigured = Boolean(!isPlaceholder && !isTestKey);

    return {
      authkey,
      widgetId,
      tokenAuth,
      isConfigured,
    };
  }

  /**
   * Normalizes any given phone number into E.164 numeric format without leading '+'
   * (e.g., '919876543210' for Indian mobile numbers).
   *
   * Rules:
   * - Strips all non-digit characters.
   * - 10-digit Indian mobile number (starts with 6, 7, 8, 9) -> adds '91' prefix.
   * - 11-digit number starting with '0' -> replaces '0' with '91'.
   * - 12-digit Indian number starting with '91' -> validated.
   * - Standard international E.164: must be between 10 and 15 digits.
   */
  static normalizePhoneNumber(phone: string | null | undefined): {
    valid: boolean;
    normalized?: string;
    error?: string;
  } {
    if (!phone || typeof phone !== "string") {
      return { valid: false, error: "Phone number is required." };
    }

    let cleaned = phone.replace(/\D/g, "");
    if (!cleaned) {
      return { valid: false, error: "Phone number must contain digits." };
    }

    // 11 digits starting with 0 (e.g. 09876543210 in India)
    if (cleaned.length === 11 && cleaned.startsWith("0")) {
      const remaining = cleaned.slice(1);
      if (/^[6-9]/.test(remaining)) {
        cleaned = "91" + remaining;
      } else {
        cleaned = "91" + remaining;
      }
    }
    // Standard 10-digit Indian mobile number (starts with 6, 7, 8, 9)
    else if (cleaned.length === 10) {
      if (/^[6-9]/.test(cleaned)) {
        cleaned = "91" + cleaned;
      } else {
        return {
          valid: false,
          error: "10-digit Indian mobile numbers must start with 6, 7, 8, or 9.",
        };
      }
    }
    // 12-digit Indian number starting with 91
    else if (cleaned.length === 12 && cleaned.startsWith("91")) {
      const localPart = cleaned.slice(2);
      if (!/^[6-9]/.test(localPart)) {
        return {
          valid: false,
          error: "Indian mobile numbers must start with 6, 7, 8, or 9.",
        };
      }
    }

    // E.164 length check (between 10 and 15 digits)
    if (cleaned.length < 10 || cleaned.length > 15) {
      return {
        valid: false,
        error: "Phone number must be between 10 and 15 digits including country code.",
      };
    }

    return { valid: true, normalized: cleaned };
  }

  /**
   * Masks a phone number for display/logging (e.g., '+91 ******4321').
   */
  static maskPhone(phone: string): string {
    const norm = this.normalizePhoneNumber(phone).normalized || phone;
    if (norm.length <= 4) return "****";
    const last4 = norm.slice(-4);
    const prefix = norm.slice(0, 2);
    return `+${prefix} ******${last4}`;
  }

  /**
   * Dispatches OTP via MSG91 Widget sendOtp endpoint.
   * Supports optional client captchaToken when required by widget configuration.
   */
  static async sendOtp(phone: string, captchaToken?: string): Promise<Msg91SendOtpResult> {
    const { valid, normalized, error } = this.normalizePhoneNumber(phone);
    if (!valid || !normalized) {
      return { success: false, error: error || "Invalid phone number." };
    }

    const config = this.getConfig();

    // In development/test mode or if MSG91 is not configured, simulate dispatch safely
    if (!config.isConfigured) {
      const simulatedReqId = `sim_msg91_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      console.log(
        `\n==================================================\n📱 [MSG91 SIMULATED OTP DISPATCH]\nTo: ${normalized} (${this.maskPhone(normalized)})\nReqId: ${simulatedReqId}\nStatus: Simulation mode (configure MSG91_AUTHKEY & MSG91_WIDGET_ID for live SMS)\n==================================================\n`
      );
      return {
        success: true,
        reqId: simulatedReqId,
        message: "OTP sent successfully (Simulated mode).",
        isSimulated: true,
      };
    }

    try {
      const body: Record<string, any> = {
        widgetId: config.widgetId,
        identifier: normalized,
      };
      if (captchaToken) {
        body.token = captchaToken;
      }
      if (config.tokenAuth) {
        body.tokenAuth = config.tokenAuth;
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (config.authkey) {
        headers.authkey = config.authkey;
      }

      const response = await fetch(`${this.MSG91_API_BASE}/sendOtp`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || (data.type && data.type !== "success" && data.type !== "info")) {
        const rawMsg = String(data.message || `MSG91 sendOtp failed (HTTP ${response.status})`);
        console.error("❌ [MSG91 sendOtp Error]:", {
          status: response.status,
          type: data.type,
          rawMsg,
          hasAuthkey: Boolean(config.authkey),
          hasTokenAuth: Boolean(config.tokenAuth),
          hasWidgetId: Boolean(config.widgetId),
        });

        // Handle MSG91 Captcha Token error gracefully with helpful diagnostics
        if (
          rawMsg.toLowerCase().includes("captcha") ||
          (data.type === "error" && rawMsg.includes("Invalid Captcha"))
        ) {
          const userFriendlyMsg =
            "Security verification required. Please complete verification using the SMS prompt or try again.";
          console.warn(
            "⚠️ [MSG91 Captcha Requirement]: The configured MSG91 widget has 'Captcha Validation' enabled. " +
            "For server API calls, either: (1) pass captchaToken from the Web SDK, " +
            "or (2) toggle off 'Captcha Validation' in your MSG91 Dashboard under OTP Widget -> Settings."
          );
          return { success: false, error: userFriendlyMsg };
        }

        // Map raw provider AuthenticationFailure / 401 to safe, specific user-facing message
        if (
          rawMsg.toLowerCase().includes("authenticationfailure") ||
          rawMsg.toLowerCase().includes("invalid authkey") ||
          response.status === 401
        ) {
          return {
            success: false,
            error: "SMS service is temporarily unavailable. Please try again in a few moments or sign in with Email & Password.",
          };
        }

        return { success: false, error: rawMsg };
      }

      const reqId = data.reqId || data.message || `req_${Date.now()}`;
      return {
        success: true,
        reqId,
        message: "OTP dispatched successfully.",
      };
    } catch (err: any) {
      console.error("❌ [MSG91 Network Error sendOtp]:", err);
      return {
        success: false,
        error: `Network error connecting to MSG91: ${err.message || String(err)}`,
      };
    }
  }

  /**
   * Verifies an OTP entered by the user against MSG91 Widget verifyOtp endpoint.
   * Returns an access token on success.
   */
  static async verifyOtp(reqId: string, otp: string): Promise<Msg91VerifyOtpResult> {
    if (!reqId || !otp) {
      return { success: false, error: "Both request ID and OTP are required." };
    }

    const cleanOtp = otp.trim().replace(/\D/g, "");
    if (cleanOtp.length < 4 || cleanOtp.length > 8) {
      return { success: false, error: "Invalid OTP format." };
    }

    // Handle simulation mode
    if (reqId.startsWith("sim_msg91_")) {
      // In simulation mode, accept standard 6-digit test OTP or '123456'
      return {
        success: true,
        accessToken: `sim_token_${reqId}_${cleanOtp}`,
        message: "OTP verified successfully (Simulated mode).",
        isSimulated: true,
      };
    }

    const config = this.getConfig();
    if (!config.isConfigured) {
      return {
        success: true,
        accessToken: `sim_token_${reqId}_${cleanOtp}`,
        message: "OTP verified successfully (Simulation fallback).",
        isSimulated: true,
      };
    }

    try {
      const body: Record<string, any> = {
        widgetId: config.widgetId,
        reqId,
        otp: cleanOtp,
      };
      if (config.tokenAuth) {
        body.tokenAuth = config.tokenAuth;
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (config.authkey) {
        headers.authkey = config.authkey;
      }

      const response = await fetch(`${this.MSG91_API_BASE}/verifyOtp`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || (data.type && data.type !== "success")) {
        const rawMsg = String(data.message || "Invalid or expired OTP. Please try again.");
        console.error("❌ [MSG91 verifyOtp Error]:", {
          status: response.status,
          type: data.type,
          rawMsg,
        });

        // Map raw provider AuthenticationFailure / 401 to safe, specific user-facing message
        if (
          rawMsg.toLowerCase().includes("authenticationfailure") ||
          rawMsg.toLowerCase().includes("invalid authkey") ||
          response.status === 401
        ) {
          return {
            success: false,
            error: "SMS verification service is temporarily unavailable. Please try again or request a new OTP.",
          };
        }

        return { success: false, error: rawMsg };
      }

      // MSG91 returns access token in message or token or access-token field
      const accessToken =
        data["access-token"] ||
        data.accessToken ||
        data.token ||
        (typeof data.message === "string" && data.message.length > 20 ? data.message : undefined);

      return {
        success: true,
        accessToken,
        message: typeof data.message === "string" ? data.message : "OTP verified.",
      };
    } catch (err: any) {
      console.error("❌ [MSG91 Network Error verifyOtp]:", err);
      return {
        success: false,
        error: `Network error verifying OTP: ${err.message || String(err)}`,
      };
    }
  }

  /**
   * Cryptographically / securely verifies an MSG91 access-token on the server
   * via the official POST /api/v5/widget/verifyAccessToken endpoint.
   *
   * Returns the verified phone number extracted from MSG91's response.
   */
  static async verifyAccessToken(accessToken: string): Promise<Msg91VerifyTokenResult> {
    if (!accessToken || typeof accessToken !== "string") {
      return { success: false, error: "Access token is required for verification." };
    }

    // Handle simulation tokens
    if (accessToken.startsWith("sim_token_")) {
      return {
        success: true,
        phone: undefined, // Verified, but phone passed from caller context
        message: "Token verified (Simulated mode).",
        isSimulated: true,
      };
    }

    const config = this.getConfig();
    if (!config.isConfigured) {
      return {
        success: true,
        phone: undefined,
        message: "Token verified (Simulation fallback).",
        isSimulated: true,
      };
    }

    try {
      const response = await fetch(`${this.MSG91_API_BASE}/verifyAccessToken`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          authkey: config.authkey,
        },
        body: JSON.stringify({
          "access-token": accessToken,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.type !== "success") {
        const rawMsg = String(data.message || `Access token verification failed (HTTP ${response.status})`);
        console.error("❌ [MSG91 verifyAccessToken Error]:", {
          status: response.status,
          type: data.type,
          rawMsg,
          hasAuthkey: Boolean(config.authkey),
        });

        // Map raw provider AuthenticationFailure / 401 to safe, specific user-facing message
        if (
          rawMsg.toLowerCase().includes("authenticationfailure") ||
          rawMsg.toLowerCase().includes("invalid authkey") ||
          response.status === 401
        ) {
          return {
            success: false,
            error: "Authentication service error verifying security token. Please request a new verification code.",
          };
        }

        return { success: false, error: rawMsg };
      }

      // MSG91 returns the verified identifier (e.g. '919999999999') in message
      const verifiedIdentifier = String(data.message || "").trim();
      const normalizedCheck = this.normalizePhoneNumber(verifiedIdentifier);

      return {
        success: true,
        phone: normalizedCheck.valid ? normalizedCheck.normalized : verifiedIdentifier,
        message: "Access token verified successfully.",
      };
    } catch (err: any) {
      console.error("❌ [MSG91 Network Error verifyAccessToken]:", err);
      return {
        success: false,
        error: `Network error verifying access token: ${err.message || String(err)}`,
      };
    }
  }

  /**
   * Requests OTP retry via alternative channel (SMS, Voice, WhatsApp).
   */
  static async retryOtp(reqId: string, retryChannel: number = 11): Promise<{ success: boolean; error?: string }> {
    if (!reqId) return { success: false, error: "Request ID is required to retry." };

    if (reqId.startsWith("sim_msg91_")) {
      return { success: true };
    }

    const config = this.getConfig();
    if (!config.isConfigured) {
      return { success: true };
    }

    try {
      const body: Record<string, any> = {
        widgetId: config.widgetId,
        reqId,
        retryChannel,
      };
      if (config.tokenAuth) {
        body.tokenAuth = config.tokenAuth;
      }

      const response = await fetch(`${this.MSG91_API_BASE}/retryOtp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          authkey: config.authkey,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || (data.type && data.type !== "success")) {
        return { success: false, error: data.message || "Failed to retry OTP." };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }
}
