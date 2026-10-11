import assert from "node:assert";
import { PaymentService } from "../services/payment-service";
import { cashfreeClient } from "../lib/cashfree";
import { prisma } from "../lib/prisma";

async function runPaymentIntegrityTests() {
  console.log("\n=======================================================");
  console.log("🧪 RUNNING PAYMENT VERIFICATION & REGISTRATION INTEGRITY TESTS");
  console.log("=======================================================\n");

  let passedTests = 0;
  function pass(title: string) {
    passedTests++;
    console.log(`   ✅ PASSED: ${title}`);
  }

  // Set up in-memory transaction store for mock tests when PostgreSQL is offline or for pure unit testing
  const testUserId = "user_student_legitimate_123";
  const otherUserId = "user_attacker_456";
  const testCourseId = "course_physics_789";

  // Mock prisma for isolated unit tests
  let mockTransactions: any[] = [];
  let mockOrders: any[] = [];
  let mockEnrollments: any[] = [];
  let mockLiveSlots: any[] = [];

  const originalFindFirst = prisma.paymentTransaction.findFirst;
  const originalFindUnique = prisma.paymentTransaction.findUnique;
  const originalUpdate = prisma.paymentTransaction.update;
  const originalOrderUpdate = prisma.paymentOrder.update;
  const originalEnrollmentUpsert = prisma.enrollment.upsert;
  const originalCourseUpdate = prisma.course.update;
  const originalSlotUpdate = prisma.liveClassSlot.update;
  const originalSlotFindUnique = prisma.liveClassSlot.findUnique;

  const { LedgerService } = await import("../services/ledger-service");
  const { RouteService } = await import("../services/route-service");
  const originalRecordLedger = LedgerService.recordCapturedPaymentLedger;
  const originalExecuteTransfer = RouteService.executeTransferIfEligible;

  LedgerService.recordCapturedPaymentLedger = async (params: any) => {
    return {
      grossEntry: { id: "entry_gross" },
      commissionEntry: { id: "entry_comm" },
      teacherEntry: { id: "entry_teacher" },
      teacherSharePaise: Math.round(params.grossAmountPaise * 0.9),
      platformCommissionPaise: Math.round(params.grossAmountPaise * 0.1),
    } as any;
  };

  RouteService.executeTransferIfEligible = async () => null as any;

  const { EventService } = await import("../services/event-service");
  const originalEmit = EventService.emit;
  EventService.emit = async () => null as any;

  const originalTeacherFindUnique = prisma.teacherProfile?.findUnique;
  if (prisma.teacherProfile) {
    (prisma.teacherProfile as any).findUnique = async () => ({ userId: "teacher_user_01" } as any);
  }
  (prisma.paymentTransaction as any).findFirst = async (args: any) => {
    const { where } = args;
    const found = mockTransactions.find((tx) => {
      const matchUser = !where.userId || tx.userId === where.userId;
      const matchOrder =
        where.OR?.some(
          (cond: any) =>
            (cond.providerOrderId && tx.providerOrderId === cond.providerOrderId) ||
            (cond.internalReference && tx.internalReference === cond.internalReference) ||
            (cond.id && tx.id === cond.id) ||
            (cond.orderId && tx.orderId === cond.orderId)
        ) ?? true;
      return matchUser && matchOrder;
    });
    return found ? { ...found } : null;
  };

  (prisma.paymentTransaction as any).update = async (args: any) => {
    const idx = mockTransactions.findIndex((tx) => tx.id === args.where.id);
    if (idx !== -1) {
      mockTransactions[idx] = { ...mockTransactions[idx], ...args.data };
      return { ...mockTransactions[idx] };
    }
    return { id: args.where.id, ...args.data };
  };

  (prisma.paymentOrder as any).update = async (args: any) => {
    const idx = mockOrders.findIndex((o) => o.id === args.where.id);
    if (idx !== -1) {
      mockOrders[idx] = { ...mockOrders[idx], ...args.data };
      return { ...mockOrders[idx] };
    }
    return { id: args.where.id, ...args.data };
  };

  (prisma.enrollment as any).upsert = async (args: any) => {
    const studentId = args.create.studentId;
    const courseId = args.create.courseId;
    let enrollment = mockEnrollments.find(
      (e) => e.studentId === studentId && e.courseId === courseId
    );
    if (enrollment) {
      enrollment.status = args.update.status;
      enrollment.enrolledAt = args.update.enrolledAt || new Date();
    } else {
      enrollment = {
        id: `enr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        studentId,
        courseId,
        status: args.create.status,
        enrolledAt: new Date(),
      };
      mockEnrollments.push(enrollment);
    }
    return { ...enrollment };
  };

  (prisma.course as any).update = async (args: any) => {
    return { id: args.where.id };
  };

  (prisma.liveClassSlot as any).update = async (args: any) => {
    const idx = mockLiveSlots.findIndex((s) => s.id === args.where.id);
    if (idx !== -1) {
      mockLiveSlots[idx] = { ...mockLiveSlots[idx], ...args.data };
    }
    return { id: args.where.id, ...args.data };
  };

  try {
    // ------------------------------------------------------------------------
    // SCENARIO 1: Payment is never initiated -> registration must not show as paid or complete
    // ------------------------------------------------------------------------
    console.log("📋 Scenario 1: Verification of non-existent / uninitiated payment order...");
    try {
      await PaymentService.verifyAndCompletePayment({
        userId: testUserId,
        orderId: "NON_EXISTENT_ORDER_12345",
      });
      assert.fail("Verification of non-existent order must fail");
    } catch (err: any) {
      assert.ok(
        err.message.includes("NOT_FOUND") || err.message.includes("not found"),
        `Error must indicate transaction not found (got: ${err.message})`
      );
      assert.strictEqual(mockEnrollments.length, 0, "No enrollment created for uninitiated payment");
      pass("Uninitiated payment rejected; no enrollment granted");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 2: Payment is cancelled (e.g. USER_DROPPED on gateway) -> remains incomplete
    // ------------------------------------------------------------------------
    console.log("\n📋 Scenario 2: Payment cancelled by user on gateway (USER_DROPPED)...");
    const cancelledOrderId = `CF_ORDER_CANCELLED_${Date.now()}`;
    const cancelledTx = {
      id: "tx_cancelled_01",
      userId: testUserId,
      orderId: "order_cancelled_01",
      provider: "CASHFREE",
      providerOrderId: cancelledOrderId,
      internalReference: `INT_${cancelledOrderId}`,
      status: "PENDING",
      amountPaise: 79900,
      currency: "INR",
      type: "COURSE_ENROLLMENT",
      courseId: testCourseId,
      course: { id: testCourseId, title: "Modern Physics", teacherId: "teacher_01" },
      order: { id: "order_cancelled_01", providerOrderId: cancelledOrderId },
    };
    mockTransactions.push(cancelledTx);

    // Create order on mock gateway
    await cashfreeClient.createOrder({
      orderId: cancelledOrderId,
      orderAmount: 799.0,
      orderCurrency: "INR",
      customerDetails: { customer_id: testUserId, customer_email: "test@educonnects.co.in" },
    });
    // Simulate gateway registering user cancelled/dropped
    cashfreeClient.simulatePaymentFailure(cancelledOrderId, "USER_DROPPED", "User closed Cashfree popup");

    try {
      await PaymentService.verifyAndCompletePayment({
        userId: testUserId,
        orderId: cancelledOrderId,
      });
      assert.fail("Cancelled payment must not be verified as complete");
    } catch (err: any) {
      assert.ok(
        err.message.includes("PAYMENT_VERIFICATION_FAILED"),
        `Expected verification failure error (got: ${err.message})`
      );
      assert.ok(
        err.message.toLowerCase().includes("dropped") || err.message.toLowerCase().includes("failed"),
        `Error must mention cancelled/dropped status (got: ${err.message})`
      );
      const updatedTx = mockTransactions.find((tx) => tx.id === "tx_cancelled_01");
      assert.strictEqual(updatedTx?.status, "FAILED", "Transaction status updated to FAILED");
      assert.strictEqual(mockEnrollments.length, 0, "No enrollment activated for cancelled payment");
      pass("Cancelled payment kept registration incomplete; marked transaction FAILED");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 3: Payment fails on gateway -> registration remains incomplete
    // ------------------------------------------------------------------------
    console.log("\n📋 Scenario 3: Payment fails on gateway (FAILED status)...");
    const failedOrderId = `CF_ORDER_FAILED_${Date.now()}`;
    const failedTx = {
      id: "tx_failed_01",
      userId: testUserId,
      orderId: "order_failed_01",
      provider: "CASHFREE",
      providerOrderId: failedOrderId,
      internalReference: `INT_${failedOrderId}`,
      status: "PENDING",
      amountPaise: 79900,
      currency: "INR",
      type: "COURSE_ENROLLMENT",
      courseId: testCourseId,
      course: { id: testCourseId, title: "Modern Physics", teacherId: "teacher_01" },
      order: { id: "order_failed_01", providerOrderId: failedOrderId },
    };
    mockTransactions.push(failedTx);

    await cashfreeClient.createOrder({
      orderId: failedOrderId,
      orderAmount: 799.0,
      orderCurrency: "INR",
      customerDetails: { customer_id: testUserId, customer_email: "test@educonnects.co.in" },
    });
    cashfreeClient.simulatePaymentFailure(failedOrderId, "FAILED", "Bank declined card transaction");

    try {
      await PaymentService.verifyAndCompletePayment({
        userId: testUserId,
        orderId: failedOrderId,
      });
      assert.fail("Failed payment must not be verified as complete");
    } catch (err: any) {
      assert.ok(
        err.message.includes("PAYMENT_VERIFICATION_FAILED"),
        `Expected verification failure error (got: ${err.message})`
      );
      const updatedTx = mockTransactions.find((tx) => tx.id === "tx_failed_01");
      assert.strictEqual(updatedTx?.status, "FAILED", "Transaction marked FAILED");
      assert.strictEqual(mockEnrollments.length, 0, "No enrollment activated for failed payment");
      pass("Failed payment kept registration incomplete; marked transaction FAILED");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 4: Payment is pending / active on gateway -> registration remains incomplete
    // ------------------------------------------------------------------------
    console.log("\n📋 Scenario 4: Payment is pending/active on gateway without completion...");
    const pendingOrderId = `CF_ORDER_PENDING_${Date.now()}`;
    const pendingTx = {
      id: "tx_pending_01",
      userId: testUserId,
      orderId: "order_pending_01",
      provider: "CASHFREE",
      providerOrderId: pendingOrderId,
      internalReference: `INT_${pendingOrderId}`,
      status: "PENDING",
      amountPaise: 79900,
      currency: "INR",
      type: "COURSE_ENROLLMENT",
      courseId: testCourseId,
      course: { id: testCourseId, title: "Modern Physics", teacherId: "teacher_01" },
      order: { id: "order_pending_01", providerOrderId: pendingOrderId },
    };
    mockTransactions.push(pendingTx);

    // Order created but NO payment simulated -> order remains ACTIVE with 0 payments
    await cashfreeClient.createOrder({
      orderId: pendingOrderId,
      orderAmount: 799.0,
      orderCurrency: "INR",
      customerDetails: { customer_id: testUserId, customer_email: "test@educonnects.co.in" },
    });

    try {
      await PaymentService.verifyAndCompletePayment({
        userId: testUserId,
        orderId: pendingOrderId,
      });
      assert.fail("Pending payment must not be verified as complete");
    } catch (err: any) {
      assert.ok(
        err.message.includes("PAYMENT_VERIFICATION_FAILED") || err.message.includes("pending"),
        `Error must indicate payment pending/incomplete (got: ${err.message})`
      );
      assert.strictEqual(mockEnrollments.length, 0, "No enrollment activated for pending payment");
      pass("Pending payment kept registration incomplete without granting access");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 5: Forged / client-supplied success response -> MUST NOT be accepted
    // ------------------------------------------------------------------------
    console.log("\n📋 Scenario 5: Forged success payload with fake payment ID on unpaid order...");
    const forgedOrderId = `CF_ORDER_FORGED_${Date.now()}`;
    const forgedTx = {
      id: "tx_forged_01",
      userId: testUserId,
      orderId: "order_forged_01",
      provider: "CASHFREE",
      providerOrderId: forgedOrderId,
      internalReference: `INT_${forgedOrderId}`,
      status: "PENDING",
      amountPaise: 79900,
      currency: "INR",
      type: "COURSE_ENROLLMENT",
      courseId: testCourseId,
      course: { id: testCourseId, title: "Modern Physics", teacherId: "teacher_01" },
      order: { id: "order_forged_01", providerOrderId: forgedOrderId },
    };
    mockTransactions.push(forgedTx);

    // Order created on gateway but NOT paid
    await cashfreeClient.createOrder({
      orderId: forgedOrderId,
      orderAmount: 799.0,
      orderCurrency: "INR",
      customerDetails: { customer_id: testUserId, customer_email: "test@educonnects.co.in" },
    });

    // Client maliciously passes paymentStatus: "SUCCESS" and fake cfPaymentId
    try {
      await PaymentService.verifyAndCompletePayment({
        userId: testUserId,
        orderId: forgedOrderId,
        paymentStatus: "SUCCESS",
        cfPaymentId: `cf_pay_forged_${Date.now()}`,
      });
      assert.fail("Forged payment success payload must be rejected when gateway has not recorded payment");
    } catch (err: any) {
      assert.ok(
        err.message.includes("PAYMENT_VERIFICATION_FAILED"),
        `Error must reject forged verification (got: ${err.message})`
      );
      assert.strictEqual(mockEnrollments.length, 0, "No enrollment activated for forged payment");
      pass("Forged client-submitted success payload rejected; gateway state enforced");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 6: Payment succeeds on gateway but verification validation checks fail
    // ------------------------------------------------------------------------
    console.log("\n📋 Scenario 6: Security validations (amount mismatch, user mismatch)...");

    // 6a: Amount Mismatch (e.g. Tampered amount: order was ₹799, gateway recorded ₹100)
    const tamperedAmountOrderId = `CF_ORDER_TAMPERED_${Date.now()}`;
    mockTransactions.push({
      id: "tx_tampered_amount",
      userId: testUserId,
      orderId: "order_tampered_amount",
      provider: "CASHFREE",
      providerOrderId: tamperedAmountOrderId,
      internalReference: `INT_${tamperedAmountOrderId}`,
      status: "PENDING",
      amountPaise: 79900, // DB expects 79900 paise (₹799)
      currency: "INR",
      type: "COURSE_ENROLLMENT",
      courseId: testCourseId,
      course: { id: testCourseId, title: "Modern Physics", teacherId: "teacher_01" },
      order: { id: "order_tampered_amount", providerOrderId: tamperedAmountOrderId },
    });

    await cashfreeClient.createOrder({
      orderId: tamperedAmountOrderId,
      orderAmount: 100.0, // Gateway order was only ₹100
      orderCurrency: "INR",
      customerDetails: { customer_id: testUserId, customer_email: "test@educonnects.co.in" },
    });
    cashfreeClient.simulatePaymentSuccess(tamperedAmountOrderId, { paymentAmount: 100.0 });

    try {
      await PaymentService.verifyAndCompletePayment({
        userId: testUserId,
        orderId: tamperedAmountOrderId,
      });
      assert.fail("Amount mismatch must trigger SECURITY_ERROR");
    } catch (err: any) {
      assert.ok(
        err.message.includes("SECURITY_ERROR") && err.message.includes("Amount mismatch"),
        `Error must report amount mismatch security error (got: ${err.message})`
      );
      pass("Amount mismatch rejected with SECURITY_ERROR");
    }

    // 6b: User Association Mismatch (order belongs to user A, but verified by user B)
    const mismatchedUserOrderId = `CF_ORDER_USER_MISMATCH_${Date.now()}`;
    mockTransactions.push({
      id: "tx_user_mismatch",
      userId: testUserId,
      orderId: "order_user_mismatch",
      provider: "CASHFREE",
      providerOrderId: mismatchedUserOrderId,
      internalReference: `INT_${mismatchedUserOrderId}`,
      status: "PENDING",
      amountPaise: 79900,
      currency: "INR",
      type: "COURSE_ENROLLMENT",
      courseId: testCourseId,
      course: { id: testCourseId, title: "Modern Physics", teacherId: "teacher_01" },
      order: { id: "order_user_mismatch", providerOrderId: mismatchedUserOrderId },
    });

    await cashfreeClient.createOrder({
      orderId: mismatchedUserOrderId,
      orderAmount: 799.0,
      orderCurrency: "INR",
      customerDetails: { customer_id: otherUserId, customer_email: "other@educonnects.co.in" }, // Different user
    });
    cashfreeClient.simulatePaymentSuccess(mismatchedUserOrderId);

    try {
      await PaymentService.verifyAndCompletePayment({
        userId: testUserId, // Logged in as testUserId, but order on gateway has otherUserId
        orderId: mismatchedUserOrderId,
      });
      assert.fail("User mismatch must trigger SECURITY_ERROR");
    } catch (err: any) {
      assert.ok(
        err.message.includes("SECURITY_ERROR") && err.message.includes("does not belong"),
        `Error must report user mismatch security error (got: ${err.message})`
      );
      pass("User association mismatch rejected with SECURITY_ERROR");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 7: Payment succeeds and is verified -> registration and enrollment complete
    // ------------------------------------------------------------------------
    console.log("\n📋 Scenario 7: Authentic successful payment confirmed by gateway...");
    const legitimateOrderId = `CF_ORDER_SUCCESS_${Date.now()}`;
    const legitTx = {
      id: "tx_legit_success",
      userId: testUserId,
      orderId: "order_legit_success",
      provider: "CASHFREE",
      providerOrderId: legitimateOrderId,
      internalReference: `INT_${legitimateOrderId}`,
      status: "PENDING",
      amountPaise: 79900,
      currency: "INR",
      type: "COURSE_ENROLLMENT",
      courseId: testCourseId,
      course: { id: testCourseId, title: "Modern Physics", teacherId: "teacher_01" },
      order: { id: "order_legit_success", providerOrderId: legitimateOrderId },
    };
    mockTransactions.push(legitTx);

    // Create order on gateway with correct details
    await cashfreeClient.createOrder({
      orderId: legitimateOrderId,
      orderAmount: 799.0,
      orderCurrency: "INR",
      customerDetails: { customer_id: testUserId, customer_email: "student@educonnects.co.in" },
    });
    // Gateway confirms payment was completed successfully
    const authenticPaymentId = `cf_pay_real_${Date.now()}`;
    cashfreeClient.simulatePaymentSuccess(legitimateOrderId, {
      cfPaymentId: authenticPaymentId,
      paymentAmount: 799.0,
    });

    const successResult = await PaymentService.verifyAndCompletePayment({
      userId: testUserId,
      orderId: legitimateOrderId,
    });

    assert.strictEqual(successResult.success, true, "Verification result returns success: true");
    assert.strictEqual(successResult.status, "CAPTURED", "Transaction status is CAPTURED");
    assert.strictEqual(successResult.courseId, testCourseId, "Course ID matches");
    assert.ok(successResult.enrollmentId, "Enrollment ID assigned");

    const capturedTx = mockTransactions.find((tx) => tx.id === "tx_legit_success");
    assert.strictEqual(capturedTx?.status, "CAPTURED", "Transaction in DB updated to CAPTURED");
    assert.strictEqual(capturedTx?.providerPaymentId, authenticPaymentId, "Real payment ID stored from gateway");

    const activatedEnrollment = mockEnrollments.find(
      (e) => e.studentId === testUserId && e.courseId === testCourseId
    );
    assert.ok(activatedEnrollment, "Student enrollment record exists");
    assert.strictEqual(activatedEnrollment?.status, "ACTIVE", "Student enrollment status is ACTIVE");
    pass("Payment verified with gateway; transaction CAPTURED; enrollment ACTIVATED");

    // ------------------------------------------------------------------------
    // SCENARIO 8: Repeated callbacks / verification requests -> idempotent (no duplicates)
    // ------------------------------------------------------------------------
    console.log("\n📋 Scenario 8: Repeated callbacks or duplicate verification requests...");
    const initialEnrollmentCount = mockEnrollments.length;

    const repeatResult = await PaymentService.verifyAndCompletePayment({
      userId: testUserId,
      orderId: legitimateOrderId,
    });

    assert.strictEqual(repeatResult.success, true, "Repeat call returns success: true");
    assert.strictEqual(repeatResult.alreadyProcessed, true, "Returns alreadyProcessed: true");
    assert.strictEqual(repeatResult.status, "CAPTURED", "Status remains CAPTURED");
    assert.strictEqual(mockEnrollments.length, initialEnrollmentCount, "No duplicate enrollment created");
    pass("Repeated verification request is idempotent; no duplicates created");

    // ------------------------------------------------------------------------
    // SCENARIO 9: Existing legitimate paid enrollments continue working normally
    // ------------------------------------------------------------------------
    console.log("\n📋 Scenario 9: Existing legitimate paid enrollment preservation...");
    const existingEnrollment = mockEnrollments.find(
      (e) => e.studentId === testUserId && e.courseId === testCourseId
    );
    assert.ok(existingEnrollment, "Existing paid enrollment found");
    assert.strictEqual(existingEnrollment.status, "ACTIVE", "Existing paid enrollment remains ACTIVE");
    pass("Existing legitimate paid enrollments preserved and active");

    console.log(`\n=======================================================`);
    console.log(`🎉 ALL ${passedTests} PAYMENT INTEGRITY SCENARIOS PASSED!`);
    console.log(`=======================================================\n`);
  } finally {
    // Restore original prisma methods
    (prisma.paymentTransaction as any).findFirst = originalFindFirst;
    (prisma.paymentTransaction as any).findUnique = originalFindUnique;
    (prisma.paymentTransaction as any).update = originalUpdate;
    (prisma.paymentOrder as any).update = originalOrderUpdate;
    (prisma.enrollment as any).upsert = originalEnrollmentUpsert;
    (prisma.course as any).update = originalCourseUpdate;
    (prisma.liveClassSlot as any).update = originalSlotUpdate;
    (prisma.liveClassSlot as any).findUnique = originalSlotFindUnique;
    LedgerService.recordCapturedPaymentLedger = originalRecordLedger;
    RouteService.executeTransferIfEligible = originalExecuteTransfer;
    EventService.emit = originalEmit;
  }
}

runPaymentIntegrityTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test Suite Failed:", err);
    process.exit(1);
  });
