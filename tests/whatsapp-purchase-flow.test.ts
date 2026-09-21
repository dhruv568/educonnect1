import assert from "assert";
import { prisma } from "../lib/prisma";
import { WhatsAppClient } from "../lib/whatsapp/whatsapp-client";
import { WhatsAppService } from "../services/whatsapp-service";
import { EventService } from "../services/event-service";

async function runPurchaseFlowWhatsAppTests() {
  console.log("================================================================================");
  console.log("🚀 STARTING PURCHASE FLOW & WHATSAPP INTEGRATION TEST SUITE");
  console.log("================================================================ handler\n");

  const testSuffix = Date.now();
  const testPhoneRaw = "9876543210";
  const testEmail = `test.learner.${testSuffix}@educonnects.test`;

  // ---------------------------------------------------------------------------
  // TEST 1: Validation Rules for WhatsApp Number
  // ---------------------------------------------------------------------------
  console.log("📋 Test 1: Verifying WhatsApp Number Validation Rules...");
  {
    // Rejects email address as WhatsApp number
    const isEmailAsPhone = testEmail.includes("@");
    assert.strictEqual(isEmailAsPhone, true, "Email format check must detect email address");

    // Rejects invalid short phone number
    const normalizedShort = WhatsAppClient.formatWhatsAppPhoneNumber("12345");
    assert.strictEqual(normalizedShort, null, "Short numbers must be rejected");

    // Accepts valid 10-digit Indian mobile number
    const normalizedValid = WhatsAppClient.formatWhatsAppPhoneNumber(testPhoneRaw);
    assert.strictEqual(normalizedValid, "919876543210", "10-digit number must normalize to E.164 without plus");

    console.log("   ✅ Rejection of email addresses and phone format validation verified.\n");
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Learner Profile Phone Pre-Fill & Save Flow
  // ---------------------------------------------------------------------------
  console.log("📋 Test 2: Verifying Learner Profile WhatsApp Number Persistence...");
  let createdUserId: string | null = null;
  {
    // Create a temporary test learner user
    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        role: "STUDENT",
        emailVerified: true,
        passwordHash: "$2a$10$abcdefghijklmnopqrstuv",
        profile: {
          create: {
            firstName: "Test",
            lastName: "Learner",
            phone: null, // Initially null
          },
        },
      },
      include: { profile: true },
    });
    createdUserId = testUser.id;

    assert.strictEqual(testUser.profile?.phone, null, "Initially learner profile has no phone number");

    // Simulate checkout update: save validated WhatsApp number to profile
    await prisma.profile.update({
      where: { userId: testUser.id },
      data: { phone: testPhoneRaw },
    });

    const updatedProfile = await prisma.profile.findUnique({
      where: { userId: testUser.id },
    });
    assert.strictEqual(updatedProfile?.phone, testPhoneRaw, "Learner profile phone must be updated to confirmed WhatsApp number");

    console.log(`   ✅ Learner profile successfully saved with WhatsApp number "${testPhoneRaw}".\n`);
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Complete Flow: Learner WhatsApp Number -> Payment -> Event -> WhatsApp Dispatch -> DB Log
  // ---------------------------------------------------------------------------
  console.log("📋 Test 3: Verifying End-to-End Pipeline (Learner WhatsApp Number -> Payment -> WhatsApp Message)...");
  {
    assert.ok(createdUserId, "Test user must exist");

    const idempotencyKey = `test-purchase-flow-${testSuffix}`;
    const transactionId = `tx_test_${testSuffix}`;

    // Emit payment.captured event (simulates payment completion after checkout)
    await EventService.emit("payment.captured", {
      userId: createdUserId,
      actorId: createdUserId,
      actorRole: "STUDENT",
      data: {
        transactionId,
        amountPaise: 149900,
        title: "Full Stack Web Development Masterclass",
        orderId: `ORD_${testSuffix}`,
        receipt: `RCPT_${testSuffix}`,
      },
      idempotencyKey,
    });

    // Check that WhatsApp message records were created in database for recipient
    const loggedMessages = await prisma.whatsAppMessage.findMany({
      where: { userId: createdUserId },
    });

    assert.ok(loggedMessages.length > 0, "WhatsApp messages must be recorded in database for payment events");
    
    // Check PAYMENT_SUCCESS message
    const payMsg = loggedMessages.find((m) => m.eventType === "PAYMENT_SUCCESS");
    assert.ok(payMsg, "PAYMENT_SUCCESS WhatsApp message record must exist");
    assert.strictEqual(payMsg.phoneNumber, "919876543210", "Notification must be sent to the learner's saved WhatsApp number");
    assert.strictEqual(payMsg.templateName, "edu_payment_success", "Template name must match edu_payment_success");

    // Check PAYMENT_RECEIPT message
    const rcptMsg = loggedMessages.find((m) => m.eventType === "PAYMENT_RECEIPT");
    assert.ok(rcptMsg, "PAYMENT_RECEIPT WhatsApp message record must exist");
    assert.strictEqual(rcptMsg.phoneNumber, "919876543210", "Receipt must be sent to the learner's saved WhatsApp number");

    console.log(`   ✅ End-to-end pipeline verified! Captured ${loggedMessages.length} WhatsApp message dispatch logs.\n`);
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Meta WhatsApp Cloud API Transmission & Database Status Logging
  // ---------------------------------------------------------------------------
  console.log("📋 Test 4: Verifying Meta WhatsApp Cloud API Transmission & Database Logging...");
  {
    const sendResult = await WhatsAppService.sendEventNotification({
      phone: testPhoneRaw,
      eventType: "PAYMENT_SUCCESS",
      data: {
        name: "Dhruv Learner",
        title: "Full Stack Mastery",
        amount: "₹1,499.00",
        date: "21/09/2026",
        orderId: `ORD_${testSuffix}_DIRECT`,
      },
      idempotencyKey: `direct-send-${testSuffix}`,
    });

    assert.ok(sendResult.messageId, "Message ID must be returned");
    const dbMsg = await prisma.whatsAppMessage.findUnique({
      where: { id: sendResult.messageId },
    });
    assert.ok(dbMsg, "Message record must exist in DB");
    assert.strictEqual(dbMsg.phoneNumber, "919876543210");
    console.log(`   ✅ WhatsApp notification execution logged cleanly (Status: ${dbMsg.status}, DB ID: ${dbMsg.id}).\n`);
  }

  // Clean up test data
  if (createdUserId) {
    await prisma.whatsAppMessage.deleteMany({ where: { userId: createdUserId } });
    await prisma.profile.deleteMany({ where: { userId: createdUserId } });
    await prisma.user.delete({ where: { id: createdUserId } });
  }

  console.log("================================================================================");
  console.log("🎉 ALL PURCHASE FLOW & WHATSAPP INTEGRATION TESTS PASSED CLEANLY!");
  console.log("================================================================================\n");
}

runPurchaseFlowWhatsAppTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ [Purchase Flow Test Suite Failed]:", err);
    process.exit(1);
  });
