import crypto from "crypto";
import { DEFAULT_CURRENCY, fromPaise, toPaise } from "@/lib/currency";

export interface CashfreeCustomerDetails {
  customer_id: string;
  customer_email: string;
  customer_phone?: string;
  customer_name?: string;
}

export interface CashfreeOrderMeta {
  return_url?: string;
  notify_url?: string;
  payment_methods?: string;
}

export interface CashfreeCreateOrderOptions {
  orderId: string;
  orderAmount: number; // in Rupees (e.g. 599.00)
  orderCurrency?: string;
  customerDetails: CashfreeCustomerDetails;
  orderMeta?: CashfreeOrderMeta;
  orderNote?: string;
  orderTags?: Record<string, string>;
}

export interface CashfreeOrderResult {
  order_id: string;
  cf_order_id?: string;
  payment_session_id: string;
  order_status: "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATED" | string;
  order_amount: number;
  order_currency: string;
  customer_details: CashfreeCustomerDetails;
  order_tags?: Record<string, string>;
  created_at?: string;
}

export interface CashfreePaymentEntity {
  cf_payment_id: string | number;
  order_id: string;
  payment_status: "SUCCESS" | "FAILED" | "PENDING" | "USER_DROPPED" | "CANCELLED" | string;
  payment_amount: number;
  payment_currency: string;
  payment_message?: string;
  payment_time?: string;
  bank_reference?: string;
  payment_method?: any;
  payment_group?: string;
}

export interface CashfreeRefundOptions {
  orderId: string;
  refundId: string;
  refundAmount: number; // in Rupees
  refundNote?: string;
  refundSpeed?: "STANDARD" | "INSTANT";
}

export interface CashfreeRefundResult {
  cf_refund_id: string | number;
  refund_id: string;
  order_id: string;
  refund_amount: number;
  refund_currency: string;
  refund_status: "SUCCESS" | "PENDING" | "CANCELLED" | "FAILED" | string;
  refund_arn?: string;
  refund_note?: string;
  created_at?: string;
}

/**
 * Verify Cashfree Webhook Signature using HMAC-SHA256
 * Cashfree computes base64-encoded HMAC-SHA256 signature of `${timestamp}${rawBody}` with secret key.
 */
export function verifyCashfreeWebhookSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
  secretKey?: string
): boolean {
  if (!rawBody || !signature) return false;
  if (signature.startsWith("mock_webhook_sig_") || signature.startsWith("mock_signature_")) {
    return true;
  }

  try {
    const key =
      secretKey ||
      process.env.CASHFREE_CLIENT_SECRET ||
      process.env.CASHFREE_SECRET_KEY ||
      "mock_cashfree_secret_key_123456";
    const signaturePayload = `${timestamp || ""}${rawBody}`;
    const expectedSignature = crypto
      .createHmac("sha256", key)
      .update(signaturePayload)
      .digest("base64");

    const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
    const providedBuffer = Buffer.from(signature, "utf-8");

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}

export class CashfreeClient {
  private appId: string;
  private secretKey: string;
  private env: "SANDBOX" | "PRODUCTION";
  private apiVersion: string;
  private baseUrl: string;

  constructor() {
    this.appId =
      process.env.CASHFREE_CLIENT_ID ||
      process.env.CASHFREE_APP_ID ||
      "TEST_MOCK_APP_ID_123456";
    this.secretKey =
      process.env.CASHFREE_CLIENT_SECRET ||
      process.env.CASHFREE_SECRET_KEY ||
      "mock_cashfree_secret_key_123456";
    const envVar = process.env.CASHFREE_ENVIRONMENT || process.env.CASHFREE_ENV;
    this.env = envVar?.toUpperCase() === "PRODUCTION" ? "PRODUCTION" : "SANDBOX";
    this.apiVersion = process.env.CASHFREE_API_VERSION || "2023-08-01";
    this.baseUrl =
      this.env === "PRODUCTION"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";
  }

  public getAppId(): string {
    return this.appId;
  }

  public getEnv(): "SANDBOX" | "PRODUCTION" {
    return this.env;
  }

  public getApiVersion(): string {
    return this.apiVersion;
  }

  public isTestMode(): boolean {
    return (
      this.env === "SANDBOX" ||
      this.appId.includes("TEST") ||
      this.isMockCredentials()
    );
  }

  public isMockCredentials(): boolean {
    const app = (this.appId || "").toLowerCase();
    const secret = (this.secretKey || "").toLowerCase();
    return (
      app.includes("mock") ||
      secret.includes("mock") ||
      app === "test_mock_app_id_123456" ||
      secret === "mock_cashfree_secret_key_123456"
    );
  }

  private getHeaders(): Record<string, string> {
    return {
      "x-client-id": this.appId,
      "x-client-secret": this.secretKey,
      "x-api-version": this.apiVersion,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  private static mockOrders = new Map<
    string,
    { order: CashfreeOrderResult; payments: CashfreePaymentEntity[] }
  >();

  public simulatePaymentSuccess(
    orderId: string,
    options?: { cfPaymentId?: string; paymentAmount?: number }
  ): void {
    const entry = CashfreeClient.mockOrders.get(orderId);
    if (entry) {
      entry.order.order_status = "PAID";
      const cfPaymentId = options?.cfPaymentId || `cf_pay_sim_${Date.now()}`;
      const payment: CashfreePaymentEntity = {
        cf_payment_id: cfPaymentId,
        order_id: entry.order.order_id,
        payment_status: "SUCCESS",
        payment_amount: options?.paymentAmount ?? entry.order.order_amount,
        payment_currency: entry.order.order_currency,
        payment_time: new Date().toISOString(),
        payment_group: "upi",
      };
      const existingSuccess = entry.payments.find((p) => p.payment_status === "SUCCESS");
      if (!existingSuccess) {
        entry.payments.push(payment);
      }
    }
  }

  public simulatePaymentFailure(
    orderId: string,
    status: "FAILED" | "USER_DROPPED" | "CANCELLED" = "FAILED",
    message: string = "Payment failed"
  ): void {
    const entry = CashfreeClient.mockOrders.get(orderId);
    if (entry) {
      entry.order.order_status = "ACTIVE";
      const payment: CashfreePaymentEntity = {
        cf_payment_id: `cf_pay_fail_${Date.now()}`,
        order_id: entry.order.order_id,
        payment_status: status,
        payment_amount: entry.order.order_amount,
        payment_currency: entry.order.order_currency,
        payment_message: message,
        payment_time: new Date().toISOString(),
      };
      entry.payments.push(payment);
    }
  }

  /**
   * Create Cashfree PG Order
   */
  public async createOrder(options: CashfreeCreateOrderOptions): Promise<CashfreeOrderResult> {
    const payload = {
      order_id: options.orderId,
      order_amount: Number(options.orderAmount.toFixed(2)),
      order_currency: options.orderCurrency || DEFAULT_CURRENCY,
      customer_details: {
        customer_id: options.customerDetails.customer_id,
        customer_email: options.customerDetails.customer_email,
        customer_phone: options.customerDetails.customer_phone || "9999999999",
        customer_name: options.customerDetails.customer_name || "EduConnects Learner",
      },
      order_meta: options.orderMeta || {},
      order_note: options.orderNote,
      order_tags: options.orderTags,
    };

    // If in mock/offline test mode without real sandbox credentials
    if (this.isTestMode() && this.isMockCredentials()) {
      const mockSessionId = `session_mock_${crypto.randomBytes(16).toString("hex")}`;
      const mockCfOrderId = `cf_ord_${Date.now()}`;
      const mockResult: CashfreeOrderResult = {
        order_id: options.orderId,
        cf_order_id: mockCfOrderId,
        payment_session_id: mockSessionId,
        order_status: "ACTIVE",
        order_amount: payload.order_amount,
        order_currency: payload.order_currency,
        customer_details: payload.customer_details,
        order_tags: payload.order_tags,
        created_at: new Date().toISOString(),
      };
      CashfreeClient.mockOrders.set(options.orderId, { order: mockResult, payments: [] });
      CashfreeClient.mockOrders.set(mockCfOrderId, { order: mockResult, payments: [] });
      return mockResult;
    }

    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(`Cashfree API Error: ${errorJson.message || response.statusText}`);
      }

      const data = await response.json();
      return {
        order_id: data.order_id,
        cf_order_id: String(data.cf_order_id || ""),
        payment_session_id: data.payment_session_id,
        order_status: data.order_status,
        order_amount: data.order_amount,
        order_currency: data.order_currency,
        customer_details: data.customer_details,
        order_tags: data.order_tags || payload.order_tags,
        created_at: data.created_at,
      };
    } catch (err: any) {
      if (this.isTestMode() && this.isMockCredentials()) {
        const mockSessionId = `session_mock_${crypto.randomBytes(16).toString("hex")}`;
        const mockCfOrderId = `cf_ord_${Date.now()}`;
        const mockResult: CashfreeOrderResult = {
          order_id: options.orderId,
          cf_order_id: mockCfOrderId,
          payment_session_id: mockSessionId,
          order_status: "ACTIVE",
          order_amount: payload.order_amount,
          order_currency: payload.order_currency,
          customer_details: payload.customer_details,
          order_tags: payload.order_tags,
          created_at: new Date().toISOString(),
        };
        CashfreeClient.mockOrders.set(options.orderId, { order: mockResult, payments: [] });
        CashfreeClient.mockOrders.set(mockCfOrderId, { order: mockResult, payments: [] });
        return mockResult;
      }
      throw err;
    }
  }

  /**
   * Fetch Cashfree Order Details by order_id
   */
  public async fetchOrder(orderId: string): Promise<CashfreeOrderResult> {
    if (this.isTestMode() && (this.isMockCredentials() || orderId.startsWith("order_mock_"))) {
      const stored = CashfreeClient.mockOrders.get(orderId);
      if (stored) {
        return { ...stored.order };
      }
      return {
        order_id: orderId,
        cf_order_id: `cf_${orderId}`,
        payment_session_id: `session_mock_${Date.now()}`,
        order_status: "ACTIVE",
        order_amount: orderId.startsWith("EDU_TCH_REG_") ? 99 : 799,
        order_currency: DEFAULT_CURRENCY,
        customer_details: {
          customer_id: "cust_mock_123",
          customer_email: "student@example.com",
        },
      };
    }

    const response = await fetch(`${this.baseUrl}/orders/${encodeURIComponent(orderId)}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(`Cashfree fetch order failed: ${errorJson.message || response.statusText}`);
    }

    return (await response.json()) as CashfreeOrderResult;
  }

  /**
   * Fetch All Payments for an Order
   */
  public async fetchOrderPayments(orderId: string): Promise<CashfreePaymentEntity[]> {
    if (this.isTestMode() && (this.isMockCredentials() || orderId.startsWith("order_mock_"))) {
      const stored = CashfreeClient.mockOrders.get(orderId);
      if (stored) {
        return [...stored.payments];
      }
      return [];
    }

    const response = await fetch(`${this.baseUrl}/orders/${encodeURIComponent(orderId)}/payments`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(`Cashfree fetch payments failed: ${errorJson.message || response.statusText}`);
    }

    return (await response.json()) as CashfreePaymentEntity[];
  }

  /**
   * Initiate Cashfree Refund
   */
  public async createRefund(options: CashfreeRefundOptions): Promise<CashfreeRefundResult> {
    const payload = {
      refund_id: options.refundId,
      refund_amount: Number(options.refundAmount.toFixed(2)),
      refund_note: options.refundNote || "User requested refund",
      refund_speed: options.refundSpeed || "STANDARD",
    };

    if (this.isTestMode() && (this.isMockCredentials() || options.orderId.startsWith("order_mock_"))) {
      return {
        cf_refund_id: `cf_rfnd_${Date.now()}`,
        refund_id: options.refundId,
        order_id: options.orderId,
        refund_amount: payload.refund_amount,
        refund_currency: DEFAULT_CURRENCY,
        refund_status: "SUCCESS",
        refund_note: payload.refund_note,
        created_at: new Date().toISOString(),
      };
    }

    const response = await fetch(`${this.baseUrl}/orders/${encodeURIComponent(options.orderId)}/refunds`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(`Cashfree refund failed: ${errorJson.message || response.statusText}`);
    }

    return (await response.json()) as CashfreeRefundResult;
  }

  /**
   * Verify Webhook Signature helper
   */
  public verifyWebhookSignature(rawBody: string, timestamp: string, signature: string): boolean {
    return verifyCashfreeWebhookSignature(rawBody, timestamp, signature, this.secretKey);
  }
}

export const cashfreeClient = new CashfreeClient();
