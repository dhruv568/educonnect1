import assert from "node:assert";
import {
  AppErrors,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  PaymentError,
  PayoutError,
  DatabaseError,
  ExternalServiceError,
  generateErrorId,
  redactSensitiveData,
  evaluateRetrySafety,
  ErrorStore,
  ErrorLogger,
} from "../lib/errors";

async function runComprehensiveErrorHandlingTests() {
  console.log("=======================================================");
  console.log("🧪 RUNNING EDUCONNECTS GLOBAL ERROR HANDLING TEST SUITE");
  console.log("=======================================================\n");

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            console.log(`   ✅ PASS: ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`   ❌ FAIL: ${name}`, err);
            throw err;
          });
      }
      console.log(`   ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`   ❌ FAIL: ${name}`, err);
      throw err;
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Missing Course Lessons Validation & Guidance (Phase 4)
  // -------------------------------------------------------------
  await test("1. Missing course lessons throws structured VALIDATION_ERROR with full guidance", () => {
    const err = AppErrors.courseNoLessons("course_abc_123", "Introduction to Physics");

    // 1. Preserve existing message convention for backward compatibility
    assert.ok(
      err.message.includes("VALIDATION_ERROR: Cannot approve/publish a course without any lessons."),
      "Message must contain exact VALIDATION_ERROR string"
    );

    // 2. Structured metadata check
    const meta = err.toMetadata();
    assert.strictEqual(meta.code, "COURSE_NO_LESSONS");
    assert.strictEqual(meta.category, "VALIDATION_ERROR");
    assert.strictEqual(meta.statusCode, 400);
    assert.strictEqual(meta.title, "Course Requires At Least One Lesson");

    // 3. Four essential explanations:
    // What happened
    assert.ok(meta.message.includes("Cannot approve/publish a course without any lessons."));
    // Why did it happen
    assert.ok(meta.why && meta.why.includes("published course must contain at least one section with at least one saved lesson"));
    // How can current user resolve it
    assert.ok(meta.resolution && meta.resolution.length >= 2);
    assert.ok(meta.resolution.some((r) => r.includes("Educator must add and save at least one lesson")));
    // What should an administrator do
    assert.ok(meta.adminGuidance && meta.adminGuidance.length >= 3);
    assert.ok(meta.adminGuidance.some((g) => g.includes("Notify the educator")));

    // 4. Affected resource tracking
    assert.strictEqual(meta.affectedResource?.id, "course_abc_123");
    assert.strictEqual(meta.affectedResource?.name, "Introduction to Physics");
  });

  // -------------------------------------------------------------
  // TEST 2: Invalid Form Data & Zod Mapping
  // -------------------------------------------------------------
  await test("2. Invalid form data mapped into structured ValidationError", () => {
    const mockZodError = {
      name: "ZodError",
      errors: [
        {
          path: ["email"],
          message: "Please enter a valid email address.",
        },
      ],
    };

    const parsed = AppErrors.fromAny(
      `VALIDATION_ERROR: ${mockZodError.errors[0].message}`,
      { route: "/api/contact", application: "main" }
    );

    assert.strictEqual(parsed.category, "VALIDATION_ERROR");
    assert.strictEqual(parsed.statusCode, 400);
    assert.ok(parsed.message.includes("Please enter a valid email address."));
    assert.strictEqual(parsed.application, "main");
    assert.strictEqual(parsed.route, "/api/contact");
  });

  // -------------------------------------------------------------
  // TEST 3: Unauthorized Access & Expired Sessions
  // -------------------------------------------------------------
  await test("3. Unauthorized access and expired sessions return safe guidance (401)", () => {
    const sessionErr = AppErrors.unauthorized();
    assert.strictEqual(sessionErr.category, "AUTHENTICATION_ERROR");
    assert.strictEqual(sessionErr.statusCode, 401);
    assert.strictEqual(sessionErr.code, "SESSION_EXPIRED");
    assert.ok(sessionErr.resolution.some((r) => r.includes("sign in again")));

    // Ensure fromAny maps raw UNAUTHORIZED message
    const fromRaw = AppErrors.fromAny("UNAUTHORIZED: Session expired or invalid.");
    assert.strictEqual(fromRaw.statusCode, 401);
    assert.strictEqual(fromRaw.category, "AUTHENTICATION_ERROR");
  });

  // -------------------------------------------------------------
  // TEST 4: Authorization & Permission Restriction (403)
  // -------------------------------------------------------------
  await test("4. Authorization restriction returns safe forbidden guidance (403)", () => {
    const authErr = AppErrors.forbidden("Educator account verification pending.");
    assert.strictEqual(authErr.category, "AUTHORIZATION_ERROR");
    assert.strictEqual(authErr.statusCode, 403);
    assert.ok(authErr.adminGuidance.some((g) => g.includes("Admin > Educator Verifications")));

    const fromRaw = AppErrors.fromAny("FORBIDDEN: User account is deactivated.");
    assert.strictEqual(fromRaw.statusCode, 403);
  });

  // -------------------------------------------------------------
  // TEST 5: Missing Records & 404 Classification
  // -------------------------------------------------------------
  await test("5. Missing records return structured NotFoundError (404)", () => {
    const notFound = AppErrors.notFound("LiveClassSlot", "slot_998877");
    assert.strictEqual(notFound.category, "NOT_FOUND");
    assert.strictEqual(notFound.statusCode, 404);
    assert.strictEqual(notFound.affectedResource?.type, "liveclassslot");
    assert.strictEqual(notFound.affectedResource?.id, "slot_998877");
  });

  // -------------------------------------------------------------
  // TEST 6: Database Failures & Safe Masking (503)
  // -------------------------------------------------------------
  await test("6. Database connection failures masked with safe reference ID without leaking SQL", () => {
    const rawPrismaError = new Error(
      "PrismaClientInitializationError: Server has closed the connection. URL: postgresql://secret_user:secret_pass@db.example.com:5432/production"
    );

    const parsed = AppErrors.fromAny(rawPrismaError, { route: "/api/courses" });
    assert.strictEqual(parsed.category, "DATABASE_ERROR");
    assert.strictEqual(parsed.statusCode, 503);
    assert.strictEqual(parsed.severity, "critical");
    assert.strictEqual(parsed.retryable, true);

    // CRITICAL: Ensure raw DB URL and passwords are NOT in the safe message
    assert.ok(!parsed.message.includes("secret_user"));
    assert.ok(!parsed.message.includes("secret_pass"));
    assert.ok(parsed.message.includes("Database connection could not be established"));
  });

  // -------------------------------------------------------------
  // TEST 7: External Service Timeouts (502 / PENDING_UNKNOWN)
  // -------------------------------------------------------------
  await test("7. External service timeouts distinguished with PENDING_UNKNOWN outcome", () => {
    const timeoutErr = AppErrors.externalServiceTimeout("Cashfree Payment Gateway");
    assert.strictEqual(timeoutErr.category, "EXTERNAL_SERVICE_ERROR");
    assert.strictEqual(timeoutErr.statusCode, 502);
    assert.strictEqual(timeoutErr.externalOutcome, "PENDING_UNKNOWN");

    // Must not be blindly retried without status verification
    const retrySafety = evaluateRetrySafety(
      "PAYMENT_INITIATION",
      timeoutErr.category,
      timeoutErr.externalOutcome
    );
    assert.strictEqual(retrySafety.allowed, false, "Must block blind retry when outcome is PENDING_UNKNOWN");
    assert.ok(retrySafety.correctiveAction?.includes("wait 2-3 minutes"));
  });

  // -------------------------------------------------------------
  // TEST 8: Confirmed Payment Failures vs Unknown Outcomes
  // -------------------------------------------------------------
  await test("8. Payment failure guidance explains user corrective action", () => {
    const confirmedFailure = AppErrors.paymentFailed({
      message: "Card transaction declined by issuing bank due to insufficient funds.",
      outcome: "CONFIRMED_FAILURE",
      orderId: "order_123456",
    });

    assert.strictEqual(confirmedFailure.category, "PAYMENT_ERROR");
    assert.strictEqual(confirmedFailure.statusCode, 400);
    assert.strictEqual(confirmedFailure.externalOutcome, "CONFIRMED_FAILURE");
    assert.ok(confirmedFailure.resolution.some((r) => r.includes("sufficient funds")));

    const retrySafety = evaluateRetrySafety(
      "PAYMENT_INITIATION",
      confirmedFailure.category,
      confirmedFailure.externalOutcome
    );
    assert.strictEqual(retrySafety.allowed, true, "Confirmed failure is safe to retry with new order");
  });

  // -------------------------------------------------------------
  // TEST 9: Failed Payout Transfers & Double-Debit Protection
  // -------------------------------------------------------------
  await test("9. Payout transfer failures enforce double-debit protection and admin verification", () => {
    const payoutErr = AppErrors.payoutFailed({
      message: "Beneficiary bank account inactive or invalid IFSC code.",
      payoutId: "payout_888999",
    });

    assert.strictEqual(payoutErr.category, "PAYOUT_ERROR");
    assert.strictEqual(payoutErr.statusCode, 422);

    const retrySafety = evaluateRetrySafety("PAYOUT_TRANSFER", payoutErr.category, "PENDING_UNKNOWN");
    assert.strictEqual(retrySafety.allowed, false, "Must prevent automatic blind payout re-execution");
    assert.ok(retrySafety.outcomeExplanation.includes("double-debiting"));
  });

  // -------------------------------------------------------------
  // TEST 10: Error Reference ID Generation
  // -------------------------------------------------------------
  await test("10. Error Reference ID format is traceable and unique", () => {
    const id1 = generateErrorId();
    const id2 = generateErrorId();
    assert.ok(id1.startsWith("ERR-"), `Expected prefix ERR-, got ${id1}`);
    assert.ok(id2.startsWith("ERR-"), `Expected prefix ERR-, got ${id2}`);
    assert.notStrictEqual(id1, id2, "Generated IDs must be unique");

    const parts = id1.split("-");
    assert.strictEqual(parts.length, 3, "Expected 3 segments: ERR-YYYYMMDD-RANDOM");
    assert.strictEqual(parts[1].length, 8, "Expected 8 digit date segment");
  });

  // -------------------------------------------------------------
  // TEST 11: Sensitive Data Redaction
  // -------------------------------------------------------------
  await test("11. Sensitive data redaction sanitizes passwords, tokens, cards, and OTPs", () => {
    const sensitivePayload = {
      email: "learner@educonnects.co.in",
      password: "SuperSecretPassword123!",
      passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz123456",
      token: "eyJh.eyJ1c2VySWQiOiIxMjMifQ.signature1234567890",
      apiKey: "mock_test_api_secret_key_987654321",
      otp: "782194",
      cardNumber: "4111 2222 3333 4444",
      accountNumber: "123456789012",
      safeNote: "Physics course enrollment",
    };

    const redacted = redactSensitiveData(sensitivePayload);

    // Secrets must be redacted
    assert.strictEqual(redacted.password, "[REDACTED]");
    assert.strictEqual(redacted.passwordHash, "[REDACTED]");
    assert.strictEqual(redacted.token, "[REDACTED]");
    assert.strictEqual(redacted.apiKey, "[REDACTED]");
    assert.strictEqual(redacted.otp, "[REDACTED]");
    assert.strictEqual(redacted.cardNumber, "[REDACTED]");

    // Account number must be masked (safe hint only)
    assert.ok(redacted.accountNumber.includes("9012"));
    assert.ok(redacted.accountNumber.includes("******"));

    // Safe non-sensitive fields must remain intact
    assert.strictEqual(redacted.email, "learner@educonnects.co.in");
    assert.strictEqual(redacted.safeNote, "Physics course enrollment");
  });

  // -------------------------------------------------------------
  // TEST 12: Recovery & Retry Safety Matrix
  // -------------------------------------------------------------
  await test("12. Retry safety matrix correctly categorizes idempotent vs non-idempotent operations", () => {
    // Payment verification: safe to retry idempotently
    const verifyGuidance = evaluateRetrySafety("PAYMENT_VERIFICATION", "NETWORK_ERROR");
    assert.strictEqual(verifyGuidance.allowed, true);
    assert.strictEqual(verifyGuidance.isIdempotent, true);

    // Course moderation retry: safe to retry after fix
    const modGuidance = evaluateRetrySafety("COURSE_MODERATION", "VALIDATION_ERROR");
    assert.strictEqual(modGuidance.allowed, true);
    assert.strictEqual(modGuidance.isIdempotent, true);

    // Client validation errors: cannot retry blindly without modifying inputs
    const clientValGuidance = evaluateRetrySafety("FORM_SUBMISSION", "VALIDATION_ERROR");
    assert.strictEqual(clientValGuidance.allowed, false);
    assert.ok(clientValGuidance.correctiveAction?.includes("update the invalid fields"));
  });

  // -------------------------------------------------------------
  // TEST 13: ErrorStore Recording, Buffer, and Querying
  // -------------------------------------------------------------
  await test("13. ErrorStore records errors in ring-buffer with search and filtering", async () => {
    const testError = AppErrors.courseNoLessons("course_test_999", "Automated Testing Course");
    const record = await ErrorStore.recordError(testError.toMetadata(), {
      route: "/api/admin/courses/course_test_999/status",
      userId: "admin_test_user",
    });

    assert.ok(record.errorId);
    assert.strictEqual(record.code, "COURSE_NO_LESSONS");
    assert.strictEqual(record.investigationStatus, "OPEN");

    // Search by error ID
    const found = await ErrorStore.getErrorById(record.errorId);
    assert.ok(found);
    assert.strictEqual(found?.errorId, record.errorId);

    // Query with filter
    const queryResult = await ErrorStore.getErrors({
      category: "VALIDATION_ERROR",
      status: "OPEN",
    });
    assert.ok(queryResult.errors.some((e) => e.errorId === record.errorId));
    assert.ok(queryResult.metrics.total > 0);
  });

  // -------------------------------------------------------------
  // TEST 14: Error Investigation Status Lifecycle (Phase 5)
  // -------------------------------------------------------------
  await test("14. Admin investigation lifecycle transitions from OPEN -> INVESTIGATING -> RESOLVED", async () => {
    const testError = AppErrors.notFound("Course", "course_xyz_not_found");
    const record = await ErrorStore.recordError(testError.toMetadata());

    assert.strictEqual(record.investigationStatus, "OPEN");

    // Transition to INVESTIGATING
    await ErrorStore.updateStatus(
      record.errorId,
      "INVESTIGATING",
      "Administrator verified course slug in catalog.",
      "admin@educonnects.co.in"
    );
    let updated = await ErrorStore.getErrorById(record.errorId);
    assert.strictEqual(updated?.investigationStatus, "INVESTIGATING");
    assert.ok(updated?.investigationNotes?.some((n) => n.includes("Administrator verified course slug")));

    // Transition to RESOLVED
    await ErrorStore.updateStatus(
      record.errorId,
      "RESOLVED",
      "Educator reinstated the published course.",
      "admin@educonnects.co.in"
    );
    updated = await ErrorStore.getErrorById(record.errorId);
    assert.strictEqual(updated?.investigationStatus, "RESOLVED");
    assert.ok(updated?.resolvedAt);
  });

  // -------------------------------------------------------------
  // TEST 15: ErrorLogger Integration & Server Output
  // -------------------------------------------------------------
  await test("15. ErrorLogger logs structured metadata with application and route context", async () => {
    const meta = await ErrorLogger.log(
      new Error("Simulated transient connection reset"),
      {
        application: "learner",
        route: "/api/student/courses",
        userId: "user_test_456",
      }
    );

    assert.ok(meta.errorId);
    assert.strictEqual(meta.application, "learner");
    assert.strictEqual(meta.route, "/api/student/courses");
    assert.strictEqual(meta.statusCode, 500);
  });

  console.log("\n=======================================================");
  console.log(`🎉 ALL ${passed} OF ${total} ERROR HANDLING TESTS PASSED SUCCESSFULLY!`);
  console.log("=======================================================\n");
}

runComprehensiveErrorHandlingTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
