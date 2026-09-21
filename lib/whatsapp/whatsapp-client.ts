/**
 * Meta WhatsApp Cloud API Client
 *
 * All WhatsApp API calls MUST be server-side.
 * Never expose the WhatsApp access token to the frontend.
 */

export interface WhatsAppTemplateComponent {
  type: "header" | "body" | "button";
  sub_type?: "quick_reply" | "url";
  index?: string | number;
  parameters: Array<{
    type: "text" | "currency" | "date_time" | "image" | "document" | "video";
    text?: string;
    currency?: {
      fallback_value: string;
      code: string;
      amount_1000: number;
    };
    date_time?: {
      fallback_value: string;
    };
    image?: { link: string };
    document?: { link: string; filename?: string };
    video?: { link: string };
  }>;
}

export interface SendTemplateMessageOptions {
  to: string; // Recipient phone number
  templateName: string;
  languageCode?: string; // Default: 'en'
  components?: WhatsAppTemplateComponent[];
  accessToken?: string;
  phoneNumberId?: string;
}

export interface SendWhatsAppResult {
  success: boolean;
  metaMessageId?: string;
  error?: string;
  isSimulated?: boolean;
}

export class WhatsAppClient {
  private static getCredentials() {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
    const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "";
    const apiVersion = process.env.WHATSAPP_API_VERSION || "v20.0";
    const webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "";

    return {
      accessToken,
      phoneNumberId,
      businessAccountId,
      apiVersion,
      webhookVerifyToken,
      isConfigured: Boolean(accessToken && phoneNumberId),
    };
  }

  /**
   * Normalizes any given phone number into E.164 format without leading '+'
   * Handles 10-digit Indian numbers, leading zeros, and international numbers.
   */
  static formatWhatsAppPhoneNumber(phone: string | null | undefined): string | null {
    if (!phone) return null;

    // Strip everything except numbers
    let cleaned = phone.replace(/\D/g, "");
    if (!cleaned) return null;

    // If starts with 0 and 11 digits (e.g. 09876543210 in India), strip 0 and add 91
    if (cleaned.length === 11 && cleaned.startsWith("0")) {
      cleaned = "91" + cleaned.slice(1);
    }
    // If standard 10-digit Indian mobile number (starts with 6, 7, 8, 9)
    else if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
      cleaned = "91" + cleaned;
    }

    // Standard E.164 length check (between 10 and 15 digits)
    if (cleaned.length < 10 || cleaned.length > 15) {
      return null;
    }

    return cleaned;
  }

  /**
   * Check if WhatsApp credentials are configured on server
   */
  static isConfigured(): boolean {
    return this.getCredentials().isConfigured;
  }

  /**
   * Send an approved Meta WhatsApp Template message
   */
  static async sendTemplateMessage(options: SendTemplateMessageOptions): Promise<SendWhatsAppResult> {
    const { to, templateName, languageCode = "en", components = [] } = options;

    const normalizedPhone = this.formatWhatsAppPhoneNumber(to);
    if (!normalizedPhone) {
      return {
        success: false,
        error: `Invalid phone number format for WhatsApp recipient: "${to}"`,
      };
    }

    const envCreds = this.getCredentials();
    const accessToken = options.accessToken || envCreds.accessToken;
    const phoneNumberId = options.phoneNumberId || envCreds.phoneNumberId;
    const apiVersion = envCreds.apiVersion;
    const isConfigured = Boolean(accessToken && phoneNumberId);

    // If credentials are not set in environment or settings, safely return without crashing
    if (!isConfigured) {
      const errorMsg =
        "WhatsApp Cloud API credentials not configured (WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is missing in environment/settings)";
      console.warn(`⚠️ [WhatsAppClient]: ${errorMsg}. Message to ${normalizedPhone} was recorded as FAILED.`);
      return {
        success: false,
        error: errorMsg,
        isSimulated: true,
      };
    }

    const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizedPhone,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        ...(components.length > 0 ? { components } : {}),
      },
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.error) {
        const errorDetail =
          data?.error?.message ||
          data?.error?.error_user_msg ||
          `HTTP ${response.status}: ${response.statusText}`;
        console.error("❌ [WhatsAppClient Error]:", data?.error || data);
        return {
          success: false,
          error: `Meta WhatsApp API Error: ${errorDetail}`,
        };
      }

      const metaMessageId = data.messages?.[0]?.id;
      return {
        success: true,
        metaMessageId: metaMessageId || undefined,
      };
    } catch (err: any) {
      console.error("❌ [WhatsAppClient Network Error]:", err);
      return {
        success: false,
        error: `Network/Connection Error sending WhatsApp message: ${err.message || String(err)}`,
      };
    }
  }
}
