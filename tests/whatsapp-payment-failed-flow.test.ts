import assert from "node:assert";
import { prisma } from "../lib/prisma";
import { WhatsAppClient } from "../lib/whatsapp/whatsapp-client";
import { WhatsAppService } from "../services/whatsapp-service";
import { EventService } from "../services/event-service";
import {
  formatDynamicUrlParameter,
  buildPaymentFailedComponents,
  DEFAULT_WHATSAPP_TEMPLATES,
  STUDENT_PAYMENT_FAILED_TEMPLATE,
  EDUCATOR_PAYMENT_FAILED_TEMPLATE,
} from "../lib/whatsapp/whatsapp-templates";

async function runPaymentFailedWhatsAppTests() {
  console.log("================================================================================");
  console.log("🚀 STARTING AUTOMATED WHATSAPP PAYMENT-FAILED NOTIFICATION INTEGRATION TESTS");
  console.log("================================================================================\n");

  const ts = Date.now();
  const studentPhone = "9876543210";
  const teacherPhone = "9876543211";
  const studentEmail = `test.student.payfail.${ts}@educonnects.test`;
  const teacherEmail = `test.teacher.payfail.${ts}@educonnects.test`;

  let studentUserId: string | null = null;
  let teacherUserId: string | null = null;

  try {
    // ---------------------------------------------------------------------------
    // TEST 1: URL Parameter Normalization
    // ---------------------------------------------------------------------------
    console.log("📋 Test 1: Verifying Dynamic URL Parameter Normalization for Meta Templates...");
    {
      assert.strictEqual(
        formatDynamicUrlParameter("https://educonnects.co.in/courses/spoken-english"),
        "courses/spoken-english",
        "Must strip origin and leading slash"
      );
      assert.strictEqual(
        formatDynamicUrlParameter("https://learners.educonnects.co.in/courses/spoken-english?retry=123"),
        "courses/spoken-english?retry=123",
        "Must preserve query params and strip domain"
      );
      assert.strictEqual(
        formatDynamicUrlParameter("/courses/spoken-english"),
        "courses/spoken-english",
        "Must strip leading slash from relative paths"
      );
      assert.strictEqual(
        formatDynamicUrlParameter("teacher/onboarding"),
        "teacher/onboarding",
        "Must maintain clean path strings"
      );
      assert.strictEqual(
        formatDynamicUrlParameter(""),
        "courses",
        "Must default to 'courses' if empty"
      );
      console.log("   ✅ Dynamic URL formatting conforms to Meta WhatsApp Cloud API standards.\n");
    }

    // ---------------------------------------------------------------------------
    // TEST 2: Template Component Builders & Parameter Counts
    // ---------------------------------------------------------------------------
    console.log("📋 Test 2: Verifying Template Components for edu_stu_payment_failed & edu_teacher_payment_failed...");
    {
      // Student Template Builder
      const stuComponents = buildPaymentFailedComponents({
        name: "Neeraj K",
        title: "Spoken English",
        retryUrl: "https://educonnects.co.in/courses/spoken-english",
        isTeacher: false,
      });

      assert.strictEqual(stuComponents.length, 3, "Components must contain Header, Body, and Button");
      
      // Header check
      const headerComp = stuComponents.find((c) => c.type === "header");
      assert.ok(headerComp, "Must include IMAGE header component");
      assert.strictEqual(headerComp.parameters[0].type, "image");
      assert.ok(headerComp.parameters[0].image?.link.includes("payment-failed-header.jpg"), "Header image link must point to banner");

      // Body check: {{1}} = Student Name, {{2}} = Course Name
      const bodyComp = stuComponents.find((c) => c.type === "body");
      assert.ok(bodyComp, "Must include Body component");
      assert.strictEqual(bodyComp.parameters.length, 2, "Body must have exactly 2 parameters: {{1}} Name and {{2}} Course");
      assert.strictEqual(bodyComp.parameters[0].text, "Neeraj K", "{{1}} must be student name");
      assert.strictEqual(bodyComp.parameters[1].text, "Spoken English", "{{2}} must be course title");

      // Button check: Dynamic URL Button at index 0
      const btnComp = stuComponents.find((c) => c.type === "button");
      assert.ok(btnComp, "Must include Button component");
      assert.strictEqual(btnComp.sub_type, "url", "Button must be URL subtype");
      assert.strictEqual(btnComp.index, "0", "Button index must be 0");
      assert.strictEqual(btnComp.parameters[0].text, "courses/spoken-english", "Button param must be dynamic URL suffix");

      // Educator Template Builder
      const teacherComponents = buildPaymentFailedComponents({
        name: "Dr. Sharma",
        title: "Educator Verification Fee",
        retryUrl: "https://educonnects.co.in/teacher/onboarding",
        isTeacher: true,
      });

      const teacherBody = teacherComponents.find((c) => c.type === "body");
      assert.strictEqual(teacherBody?.parameters[0].text, "Dr. Sharma");
      assert.strictEqual(teacherBody?.parameters[1].text, "Educator Verification Fee");
      const teacherBtn = teacherComponents.find((c) => c.type === "button");
      assert.strictEqual(teacherBtn?.parameters[0].text, "teacher/onboarding");

      console.log("   ✅ Component structures, body parameters, and URL buttons verified successfully.\n");
    }

    // ---------------------------------------------------------------------------
    // TEST 3: Student Payment Failed Flow (payment.failed -> edu_stu_payment_failed)
    // ---------------------------------------------------------------------------
    console.log("📋 Test 3: Verifying Student Payment Failed Flow...");
    {
      const student = await prisma.user.create({
        data: {
          email: studentEmail,
          role: "STUDENT",
          emailVerified: true,
          passwordHash: "$2a$10$abcdefghijklmnopqrstuv",
          profile: {
            create: {
              firstName: "Neeraj",
              lastName: "Kumar",
              phone: studentPhone,
            },
          },
        },
        include: { profile: true },
      });
      studentUserId = student.id;

      const orderId = `ORD_STU_${ts}`;
      const idempotencyKey = `test-stu-fail-${ts}`;

      // Emit payment.failed event
      await EventService.emit("payment.failed", {
        userId: student.id,
        actorId: student.id,
        actorRole: "STUDENT",
        data: {
          orderId,
          title: "Spoken English",
          reason: "Bank server timeout",
          retryUrl: `https://educonnects.co.in/courses/spoken-english`,
        },
        idempotencyKey,
      });

      // Verify message logged in whatsapp_messages
      const loggedStuMsg = await prisma.whatsAppMessage.findFirst({
        where: { userId: student.id, eventType: "PAYMENT_FAILED" },
      });

      assert.ok(loggedStuMsg, "WhatsAppMessage record must exist for student payment.failed");
      assert.strictEqual(
        loggedStuMsg.templateName,
        "edu_stu_payment_failed",
        "Student payment failure MUST use template edu_stu_payment_failed"
      );
      assert.strictEqual(
        loggedStuMsg.phoneNumber,
        `91${studentPhone}`,
        "Recipient must be the student's registered profile.phone"
      );
      assert.notStrictEqual(
        loggedStuMsg.templateName,
        "edu_teacher_payment_failed",
        "Student MUST NEVER receive the educator template"
      );

      console.log(`   ✅ Student received edu_stu_payment_failed on ${loggedStuMsg.phoneNumber}.\n`);
    }

    // ---------------------------------------------------------------------------
    // TEST 4: Educator Payment Failed Flow (payment.failed -> edu_teacher_payment_failed)
    // ---------------------------------------------------------------------------
    console.log("📋 Test 4: Verifying Educator Payment Failed Flow...");
    {
      const teacher = await prisma.user.create({
        data: {
          email: teacherEmail,
          role: "TEACHER",
          emailVerified: true,
          passwordHash: "$2a$10$abcdefghijklmnopqrstuv",
          profile: {
            create: {
              firstName: "Anjali",
              lastName: "Deshmukh",
              phone: null, // Learner profile phone is intentionally null
            },
          },
          teacherProfile: {
            create: {
              contactPhone: teacherPhone, // Educator contact phone
              headline: "Senior Physics Educator",
            },
          },
        },
        include: { profile: true, teacherProfile: true },
      });
      teacherUserId = teacher.id;

      const orderId = `EDU_TCH_REG_${ts}`;
      const idempotencyKey = `test-teacher-fail-${ts}`;

      // Emit payment.failed event for educator
      await EventService.emit("payment.failed", {
        userId: teacher.id,
        actorId: teacher.id,
        actorRole: "TEACHER",
        data: {
          orderId,
          title: "Educator Annual Accreditation",
          reason: "Card payment declined",
          retryUrl: "https://educonnects.co.in/teacher/onboarding",
          isTeacher: true,
        },
        idempotencyKey,
      });

      // Verify message logged in whatsapp_messages
      const loggedTeacherMsg = await prisma.whatsAppMessage.findFirst({
        where: { userId: teacher.id, eventType: "PAYMENT_FAILED" },
      });

      assert.ok(loggedTeacherMsg, "WhatsAppMessage record must exist for teacher payment.failed");
      assert.strictEqual(
        loggedTeacherMsg.templateName,
        "edu_teacher_payment_failed",
        "Educator payment failure MUST use template edu_teacher_payment_failed"
      );
      assert.strictEqual(
        loggedTeacherMsg.phoneNumber,
        `91${teacherPhone}`,
        "Recipient must be the educator's registered teacherProfile.contactPhone"
      );
      assert.notStrictEqual(
        loggedTeacherMsg.templateName,
        "edu_stu_payment_failed",
        "Educator MUST NEVER receive the student template"
      );

      console.log(`   ✅ Educator received edu_teacher_payment_failed on ${loggedTeacherMsg.phoneNumber}.\n`);
    }

    // ---------------------------------------------------------------------------
    // TEST 5: Idempotency & Deduplication
    // ---------------------------------------------------------------------------
    console.log("📋 Test 5: Verifying Idempotency Deduplication on Repeated Webhooks...");
    {
      assert.ok(studentUserId);
      const duplicateOrderId = `ORD_DUP_${ts}`;
      const idempotencyKey = `test-dedup-fail-${ts}`;

      // Call 1
      await EventService.emit("payment.failed", {
        userId: studentUserId,
        actorId: studentUserId,
        actorRole: "STUDENT",
        data: {
          orderId: duplicateOrderId,
          title: "Full Stack Mastery",
          reason: "Payment cancelled by user",
          retryUrl: "https://educonnects.co.in/courses/full-stack",
        },
        idempotencyKey,
      });

      const countAfterFirst = await prisma.whatsAppMessage.count({
        where: { idempotencyKey: `wa-${idempotencyKey}` },
      });
      assert.strictEqual(countAfterFirst, 1, "First call must create exactly 1 record");

      // Simulate successful transmission status
      await prisma.whatsAppMessage.update({
        where: { idempotencyKey: `wa-${idempotencyKey}` },
        data: { status: "SENT", metaMessageId: `wamid.test.${ts}` },
      });

      // Call 2 (Duplicate Webhook)
      await EventService.emit("payment.failed", {
        userId: studentUserId,
        actorId: studentUserId,
        actorRole: "STUDENT",
        data: {
          orderId: duplicateOrderId,
          title: "Full Stack Mastery",
          reason: "Payment cancelled by user",
          retryUrl: "https://educonnects.co.in/courses/full-stack",
        },
        idempotencyKey,
      });

      const countAfterDuplicate = await prisma.whatsAppMessage.count({
        where: { idempotencyKey: `wa-${idempotencyKey}` },
      });
      assert.strictEqual(countAfterDuplicate, 1, "Duplicate webhook MUST NOT create duplicate WhatsApp messages");

      console.log("   ✅ Deduplication confirmed: duplicate payment-failed trigger sent 0 additional messages.\n");
    }

    // ---------------------------------------------------------------------------
    // TEST 6: Missing / Invalid Phone Zero-Disruption Handling
    // ---------------------------------------------------------------------------
    console.log("📋 Test 6: Verifying Zero-Disruption & Safe Logging for Missing Phone Numbers...");
    {
      // Create user without any phone number
      const noPhoneUser = await prisma.user.create({
        data: {
          email: `no.phone.${ts}@educonnects.test`,
          role: "STUDENT",
          emailVerified: true,
          passwordHash: "$2a$10$abcdefghijklmnopqrstuv",
          profile: {
            create: {
              firstName: "NoPhone",
              lastName: "User",
              phone: null,
            },
          },
        },
      });

      // Emit event: must NOT throw error
      await EventService.emit("payment.failed", {
        userId: noPhoneUser.id,
        actorId: noPhoneUser.id,
        actorRole: "STUDENT",
        data: {
          orderId: `ORD_NOPHONE_${ts}`,
          title: "Data Science Specialization",
          reason: "User closed window",
          retryUrl: "https://educonnects.co.in/courses/data-science",
        },
      });

      const failedLog = await prisma.whatsAppMessage.findFirst({
        where: { userId: noPhoneUser.id, eventType: "PAYMENT_FAILED" },
      });

      assert.ok(failedLog, "Failed dispatch must be logged in database");
      assert.strictEqual(failedLog.status, "FAILED");
      assert.ok(
        failedLog.errorMessage?.includes("No phone number available on user profile"),
        `Error must clearly explain missing phone: ${failedLog.errorMessage}`
      );

      // Clean up noPhoneUser
      await prisma.whatsAppMessage.deleteMany({ where: { userId: noPhoneUser.id } });
      await prisma.notification.deleteMany({ where: { userId: noPhoneUser.id } });
      await prisma.profile.deleteMany({ where: { userId: noPhoneUser.id } });
      await prisma.user.delete({ where: { id: noPhoneUser.id } });

      console.log("   ✅ Missing phone was gracefully handled with FAILED database audit and zero platform disruption.\n");
    }

  } finally {
    // Clean up test data
    if (studentUserId) {
      await prisma.whatsAppMessage.deleteMany({ where: { userId: studentUserId } }).catch(() => {});
      await prisma.notification.deleteMany({ where: { userId: studentUserId } }).catch(() => {});
      await prisma.profile.deleteMany({ where: { userId: studentUserId } }).catch(() => {});
      await prisma.user.delete({ where: { id: studentUserId } }).catch(() => {});
    }
    if (teacherUserId) {
      await prisma.whatsAppMessage.deleteMany({ where: { userId: teacherUserId } }).catch(() => {});
      await prisma.notification.deleteMany({ where: { userId: teacherUserId } }).catch(() => {});
      await prisma.teacherProfile.deleteMany({ where: { userId: teacherUserId } }).catch(() => {});
      await prisma.profile.deleteMany({ where: { userId: teacherUserId } }).catch(() => {});
      await prisma.user.delete({ where: { id: teacherUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  console.log("================================================================================");
  console.log("🎉 ALL WHATSAPP PAYMENT-FAILED FLOW INTEGRATION TESTS PASSED CLEANLY!");
  console.log("================================================================================\n");
}

runPaymentFailedWhatsAppTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ [Payment Failed WhatsApp Test Suite Failed]:", err);
    process.exit(1);
  });
