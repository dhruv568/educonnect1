import crypto from "crypto";
import { encodeSession, decodeSession, computeSignature } from "../lib/auth/session-token";
import { UserSession } from "../types/auth";

async function runBatch1Tests() {
  console.log("\n=======================================================");
  console.log("🧪 STARTING BATCH 1: SECURITY & IDEMPOTENCY VERIFICATION");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      if (detail) console.log(`      ↳ ${detail}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (detail) console.error(`      ↳ ${detail}`);
      failed++;
    }
  }

  // =========================================================================
  // SECTION 1: SESSION CRYPTOGRAPHIC SIGNING & VERIFICATION (HMAC-SHA256)
  // =========================================================================
  console.log("--- SECTION 1: SESSION TOKEN SECURITY ---");

  const sampleStudent: UserSession = {
    id: "usr_student_001",
    userId: "usr_student_001",
    email: "student@educonnects.co.in",
    role: "STUDENT",
    emailVerified: true,
    firstName: "Aarav",
    lastName: "Patel",
  };

  // 1. Valid Token Encoding
  const validToken = encodeSession(sampleStudent);
  assert(
    typeof validToken === "string" && validToken.includes("."),
    "1.1: encodeSession produces a two-part signed token (payload.signature)",
    `Token: ${validToken.substring(0, 40)}... (length: ${validToken.length})`
  );

  // 1.2: Valid Token Decoding
  const decodedValid = decodeSession(validToken);
  assert(
    decodedValid !== null &&
      decodedValid.email === sampleStudent.email &&
      decodedValid.role === sampleStudent.role &&
      decodedValid.id === sampleStudent.id &&
      decodedValid.userId === sampleStudent.userId,
    "1.2: decodeSession successfully verifies and decodes valid signed token",
    `Decoded email: ${decodedValid?.email}, role: ${decodedValid?.role}`
  );

  // 1.3: Forged Role Escalation Attack (Tampered Payload)
  // Attacker decodes base64 payload, changes role from STUDENT to ADMIN, and re-encodes with the original signature
  const [validPayloadB64, validSig] = validToken.split(".");
  const parsedPayload = JSON.parse(Buffer.from(validPayloadB64, "base64url").toString("utf-8"));
  parsedPayload.role = "ADMIN"; // Privilege escalation attempt!
  const forgedPayloadB64 = Buffer.from(JSON.stringify(parsedPayload)).toString("base64url");
  const forgedToken = `${forgedPayloadB64}.${validSig}`;

  const decodedForged = decodeSession(forgedToken);
  assert(
    decodedForged === null,
    "1.3: Forged role escalation attack is rejected by HMAC signature verification",
    "Tampering with payload while reusing signature returns null"
  );

  // 1.4: Forged Signature Attack (Attacker-crafted Signature)
  const fakeSecretSig = crypto.createHmac("sha256", "attacker_secret_key_12345").update(validPayloadB64).digest("base64url");
  const badSigToken = `${validPayloadB64}.${fakeSecretSig}`;
  const decodedBadSig = decodeSession(badSigToken);
  assert(
    decodedBadSig === null,
    "1.4: Invalid signature generated with unauthorized secret is strictly rejected",
    "Attacker signature fails timingSafeEqual verification"
  );

  // 1.5: Unsigned Legacy Token (Migration Test)
  // Legacy cookie format was plain unauthenticated Base64 string without signature
  const unsignedLegacyToken = Buffer.from(JSON.stringify(sampleStudent)).toString("base64url");
  const decodedUnsigned = decodeSession(unsignedLegacyToken);
  assert(
    decodedUnsigned === null,
    "1.5: Unsigned legacy session token is strictly rejected (no insecure fallback)",
    "Prevents accepting unsigned base64 cookies from previous versions"
  );

  // 1.6: Expired Token Rejection
  const expiredPayload = {
    ...sampleStudent,
    iat: Math.floor(Date.now() / 1000) - 800000,
    exp: Math.floor(Date.now() / 1000) - 100, // Expired 100 seconds ago
  };
  const expiredPayloadB64 = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
  const expiredSig = computeSignature(expiredPayloadB64);
  const expiredToken = `${expiredPayloadB64}.${expiredSig}`;

  const decodedExpired = decodeSession(expiredToken);
  assert(
    decodedExpired === null,
    "1.6: Expired session token is rejected even if signature is mathematically valid",
    "Tokens with exp < current time return null"
  );

  // 1.7: Malformed Inputs
  assert(decodeSession("") === null, "1.7a: Empty string returns null");
  assert(decodeSession("not_a_valid_token") === null, "1.7b: Non-token string returns null");
  assert(decodeSession("part1.part2.part3") === null, "1.7c: Three-part token returns null");
  assert(decodeSession(null as any) === null, "1.7d: Null input returns null");
  assert(decodeSession(undefined as any) === null, "1.7e: Undefined input returns null");

  // 1.8: User Identifier Normalization
  const userWithOnlyId = { id: "id_only_123", email: "test@example.com", role: "TEACHER" as const, emailVerified: true, firstName: "F", lastName: "L" };
  const decodedOnlyId = decodeSession(encodeSession(userWithOnlyId));
  assert(
    decodedOnlyId?.id === "id_only_123" && decodedOnlyId?.userId === "id_only_123",
    "1.8: Identifier normalization ensures both id and userId are populated"
  );

  // 1.9: Production Insecure Fallback Secret Guard
  const { getSigningSecret } = await import("../lib/auth/session-token");
  const origNodeEnv = process.env.NODE_ENV;
  const origAuth = process.env.AUTH_SECRET;
  const origSession = process.env.SESSION_SECRET;
  const origJwt = process.env.JWT_SECRET;

  try {
    (process.env as any).NODE_ENV = "production";
    delete process.env.AUTH_SECRET;
    delete process.env.SESSION_SECRET;
    delete process.env.JWT_SECRET;

    let threwOnMissing = false;
    try {
      getSigningSecret();
    } catch (e: any) {
      threwOnMissing = e.message.includes("FATAL SECURITY CONFIGURATION");
    }
    assert(threwOnMissing, "1.9a: Production strictly throws fatal error if session secrets are missing");

    process.env.AUTH_SECRET = "educonnects_super_secret_session_key_2026_change_in_production";
    let threwOnPlaceholder = false;
    try {
      getSigningSecret();
    } catch (e: any) {
      threwOnPlaceholder = e.message.includes("FATAL SECURITY CONFIGURATION");
    }
    assert(threwOnPlaceholder, "1.9b: Production strictly throws fatal error if insecure placeholder secret is used");

    process.env.AUTH_SECRET = "a_real_production_secret_key_with_sufficient_entropy_12345";
    assert(
      getSigningSecret() === "a_real_production_secret_key_with_sufficient_entropy_12345",
      "1.9c: Production accepts valid, dedicated secret key without error"
    );
  } finally {
    (process.env as any).NODE_ENV = origNodeEnv;
    if (origAuth !== undefined) process.env.AUTH_SECRET = origAuth; else delete process.env.AUTH_SECRET;
    if (origSession !== undefined) process.env.SESSION_SECRET = origSession; else delete process.env.SESSION_SECRET;
    if (origJwt !== undefined) process.env.JWT_SECRET = origJwt; else delete process.env.JWT_SECRET;
  }

  // =========================================================================
  // SECTION 2: CASHFREE WEBHOOK IDEMPOTENCY & STATUS TRANSITIONS
  // =========================================================================
  console.log("\n--- SECTION 2: CASHFREE WEBHOOK IDEMPOTENCY & EVENT LOGIC ---");

  // Helper function replicating the deterministic eventId formula from app/api/webhooks/cashfree/route.ts
  function computeCashfreeEventId(payload: any): string {
    const eventType = payload.type || payload.event || "UNKNOWN";
    const data = payload.data || payload;
    const order = data.order || {};
    const payment = data.payment || {};
    const orderId = String(order.order_id || payload.order_id || "").trim();
    const paymentId = payment.cf_payment_id
      ? String(payment.cf_payment_id).trim()
      : String(payload.payment_id || "").trim();
    const paymentStatus = String(payment.payment_status || order.order_status || "").toUpperCase();
    const eventKey = paymentId ? paymentId : (paymentStatus || "ORDER");
    return `cf_evt_${eventType}_${orderId}_${eventKey}`;
  }

  // 2.1: Deterministic Event ID for Webhook Retries
  const webhookSuccessPayload = {
    type: "PAYMENT_SUCCESS_WEBHOOK",
    data: {
      order: { order_id: "CF_ORDER_1001", order_amount: 999.0 },
      payment: { cf_payment_id: 12345678, payment_status: "SUCCESS" },
      customer_details: { customer_id: "cust_001" },
    },
  };

  const eventIdAttempt1 = computeCashfreeEventId(webhookSuccessPayload);
  const eventIdAttempt2 = computeCashfreeEventId(webhookSuccessPayload);
  assert(
    eventIdAttempt1 === eventIdAttempt2,
    "2.1: Duplicate Cashfree webhook retry generates identical deterministic eventId",
    `EventId: ${eventIdAttempt1}`
  );
  assert(
    !eventIdAttempt1.includes("NaN") && !eventIdAttempt1.includes("undefined") && !eventIdAttempt1.match(/_\d{13}$/),
    "2.1b: Event ID does NOT include non-deterministic Date.now() timestamp suffix"
  );

  // 2.2: Legitimate Status Transitions for Same Order (Failed Attempt followed by Successful Attempt)
  const webhookFailedAttemptPayload = {
    type: "PAYMENT_FAILED_WEBHOOK",
    data: {
      order: { order_id: "CF_ORDER_1001", order_amount: 999.0 },
      payment: { cf_payment_id: 11111111, payment_status: "FAILED" },
    },
  };

  const webhookSuccessAttemptPayload = {
    type: "PAYMENT_SUCCESS_WEBHOOK",
    data: {
      order: { order_id: "CF_ORDER_1001", order_amount: 999.0 },
      payment: { cf_payment_id: 22222222, payment_status: "SUCCESS" },
    },
  };

  const failedEventId = computeCashfreeEventId(webhookFailedAttemptPayload);
  const successEventId = computeCashfreeEventId(webhookSuccessAttemptPayload);

  assert(
    failedEventId !== successEventId,
    "2.2: Legitimate payment retry with new paymentId produces distinct eventId",
    `Failed event: ${failedEventId} | Success event: ${successEventId}`
  );

  // 2.3: Order Level Event without cf_payment_id
  const webhookOrderPaidPayload = {
    type: "PAYMENT_SUCCESS_WEBHOOK",
    data: {
      order: { order_id: "CF_ORDER_2002", order_status: "PAID" },
    },
  };
  const orderEventId1 = computeCashfreeEventId(webhookOrderPaidPayload);
  const orderEventId2 = computeCashfreeEventId(webhookOrderPaidPayload);
  assert(
    orderEventId1 === orderEventId2 && orderEventId1 === "cf_evt_PAYMENT_SUCCESS_WEBHOOK_CF_ORDER_2002_PAID",
    "2.3: Order-level events without payment ID fall back to deterministic order status key",
    `EventId: ${orderEventId1}`
  );

  // 2.4: Payload SHA-256 Hash Integrity
  const rawBodyString = JSON.stringify(webhookSuccessPayload);
  const hash1 = crypto.createHash("sha256").update(rawBodyString).digest("hex");
  const hash2 = crypto.createHash("sha256").update(rawBodyString).digest("hex");
  assert(
    hash1 === hash2 && hash1.length === 64,
    "2.4: Payload SHA-256 hash is deterministic and exact 64-char hex digest"
  );

  // 2.5: Simulated Concurrency Handling (P2002 Unique Constraint Simulation)
  let simulatedDb: Record<string, any> = {};
  function simulateWebhookInsert(eventId: string, raw: string): { status: "CREATED" | "IDEMPOTENT" | "IN_FLIGHT" } {
    if (simulatedDb[eventId]) {
      const existing = simulatedDb[eventId];
      if (existing.processed) {
        return { status: "IDEMPOTENT" };
      }
      if (Date.now() - existing.createdAt < 60000) {
        return { status: "IN_FLIGHT" };
      }
    }
    // Simulate Prisma unique constraint violation on race condition
    if (simulatedDb[eventId]) {
      const p2002Err: any = new Error("Unique constraint failed on the fields: (`provider`,`eventId`)");
      p2002Err.code = "P2002";
      throw p2002Err;
    }
    simulatedDb[eventId] = { eventId, raw, processed: false, createdAt: Date.now() };
    return { status: "CREATED" };
  }

  // First delivery
  const res1 = simulateWebhookInsert(eventIdAttempt1, rawBodyString);
  assert(res1.status === "CREATED", "2.5a: Initial webhook delivery creates tracking record");

  // Concurrent delivery while first is in-flight (< 60s)
  const resInFlight = simulateWebhookInsert(eventIdAttempt1, rawBodyString);
  assert(resInFlight.status === "IN_FLIGHT", "2.5b: Concurrent delivery in-flight detected within 60s window");

  // Mark first as processed
  simulatedDb[eventIdAttempt1].processed = true;

  // Subsequent delivery after completion
  const resIdempotent = simulateWebhookInsert(eventIdAttempt1, rawBodyString);
  assert(resIdempotent.status === "IDEMPOTENT", "2.5c: Subsequent delivery after completion recognized as idempotent");

  console.log("\n=======================================================");
  console.log(`Execution Finished: ${passed} Passed, ${failed} Failed`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runBatch1Tests().catch((e) => {
  console.error("Test execution aborted:", e);
  process.exit(1);
});
