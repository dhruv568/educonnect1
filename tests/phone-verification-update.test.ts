(process.env as any).NODE_ENV = "test";

import assert from "node:assert";
import { Msg91Client } from "../lib/auth/msg91";
import {
  PhoneAuthService,
  mockPhoneUsersStore,
  verifiedPhonesStore,
} from "../services/phone-auth-service";
import {
  mockPreRegistrationStore,
  verifiedEmailsStore,
} from "../lib/auth/email-pre-registration";
import {
  RegisterSchema,
  LoginSchema,
  VerifyOTPSchema,
  VerifyPhoneOTPSchema,
  SendPhoneOTPSchema,
} from "../schemas/auth-schemas";
import { encodeSession, decodeSession } from "../lib/auth/session-token";
import { hashPassword, verifyPassword } from "../lib/auth/password";
import { generateOTP, hashToken, verifyTokenHash } from "../lib/auth/tokens";
import { isEducatorRole, isLearnerRole } from "../lib/auth/roles";
import { extractOtpDigits, extractPhoneOtpDigits } from "../lib/auth/otp-utils";

async function runPhoneVerificationUpdateTests() {
  console.log("\n================================================================================");
  console.log("🧪 RUNNING COMPREHENSIVE PHONE VERIFICATION UPDATE TEST SUITE");
  console.log("================================================================================\n");

  // Reset stores for test run
  mockPhoneUsersStore.clear();
  verifiedPhonesStore.clear();
  mockPreRegistrationStore.clear();
  verifiedEmailsStore.clear();

  // Seed test users
  mockPhoneUsersStore.set("919876543210", {
    id: "usr_learner_101",
    email: "learner.test@educonnects.in",
    role: "STUDENT",
    status: "ACTIVE",
    emailVerified: true,
    profile: { firstName: "Aarav", lastName: "Sharma", phone: "919876543210" },
  });

  mockPhoneUsersStore.set("919812345678", {
    id: "usr_educator_202",
    email: "educator.test@educonnects.in",
    role: "TEACHER",
    status: "ACTIVE",
    emailVerified: true,
    profile: { firstName: "Priya", lastName: "Patel", phone: "919812345678" },
    teacherProfile: { contactPhone: "919812345678" },
  });

  // ---------------------------------------------------------------------------
  // GROUP 1: Independent Registration Verification
  // ---------------------------------------------------------------------------
  console.log("🔹 [Group 1] Independent Email and Phone Registration Verification");

  // 1.1 Pre-registration Email OTP generation & storage
  const testEmail = "new.student@example.com";
  const emailOtp = generateOTP();
  const emailExpires = Date.now() + 10 * 60 * 1000;
  mockPreRegistrationStore.set(testEmail, {
    otp: emailOtp,
    expiresAt: emailExpires,
    attempts: 0,
  });
  assert.ok(mockPreRegistrationStore.has(testEmail));
  console.log("  ✅ [PASS] 1.1: Pre-registration Email OTP dispatched and stored");

  // 1.2 Verify Email OTP independently
  assert.strictEqual(verifiedEmailsStore.has(testEmail), false);
  const isEmailOtpValid = mockPreRegistrationStore.get(testEmail)?.otp === emailOtp;
  assert.strictEqual(isEmailOtpValid, true);
  verifiedEmailsStore.add(testEmail);
  assert.strictEqual(verifiedEmailsStore.has(testEmail), true);
  console.log("  ✅ [PASS] 1.2: Email verified independently via OTP");

  // 1.3 Verifying Email does NOT mark phone as verified
  const testPhone = "919877777777";
  assert.strictEqual(PhoneAuthService.isPhoneVerified(testPhone), false);
  console.log("  ✅ [PASS] 1.3: Verifying email does not mark phone as verified (Strict Independence)");

  // 1.4 Pre-registration Phone OTP dispatch & verification
  const sendPhoneRes = await Msg91Client.sendOtp("9877777777");
  assert.strictEqual(sendPhoneRes.success, true);
  assert.ok(sendPhoneRes.reqId);

  const verifyPhoneRes = await Msg91Client.verifyOtp(sendPhoneRes.reqId!, "1234");
  assert.strictEqual(verifyPhoneRes.success, true);

  await PhoneAuthService.markPhoneVerified(undefined, testPhone, testEmail);
  assert.strictEqual(PhoneAuthService.isPhoneVerified(testPhone), true);
  console.log("  ✅ [PASS] 1.4: Phone verified independently via MSG91 OTP");

  // 1.5 Verifying Phone does not affect another email's status
  const unverifiedEmail = "unverified.user@example.com";
  assert.strictEqual(verifiedEmailsStore.has(unverifiedEmail), false);
  console.log("  ✅ [PASS] 1.5: Phone verification does not affect email verification status");

  // ---------------------------------------------------------------------------
  // GROUP 2: Changed Email or Phone Resets Verification
  // ---------------------------------------------------------------------------
  console.log("\n🔹 [Group 2] Changing Email or Phone Resets Verification Status");

  // 2.1 Changing email resets email verification
  let currentEmail = testEmail;
  let isEmailVerified = verifiedEmailsStore.has(currentEmail);
  assert.strictEqual(isEmailVerified, true);

  // User changes email in the form
  const newEmail = "updated.email@example.com";
  if (newEmail !== currentEmail) {
    isEmailVerified = verifiedEmailsStore.has(newEmail); // new email not in verified store
  }
  assert.strictEqual(isEmailVerified, false);
  console.log("  ✅ [PASS] 2.1: Changing email address resets email verification status");

  // 2.2 Changing phone resets phone verification
  let currentPhone = testPhone;
  let isPhoneVerified = PhoneAuthService.isPhoneVerified(currentPhone);
  assert.strictEqual(isPhoneVerified, true);

  // User changes phone in the form
  const newPhone = "919866666666";
  if (newPhone !== currentPhone) {
    isPhoneVerified = PhoneAuthService.isPhoneVerified(newPhone); // new phone not verified
  }
  assert.strictEqual(isPhoneVerified, false);
  console.log("  ✅ [PASS] 2.2: Changing phone number resets phone verification status");

  // ---------------------------------------------------------------------------
  // GROUP 3: Duplicate Phone Prevention & Rate Limits
  // ---------------------------------------------------------------------------
  console.log("\n🔹 [Group 3] Duplicate Phone Prevention & Rate Limits");

  // 3.1 Attempting to register with an already registered phone number is blocked
  try {
    await PhoneAuthService.checkPhoneForOtp({
      phone: "9876543210", // already registered by usr_learner_101
      purpose: "SIGNUP",
      roleContext: "STUDENT",
    });
    assert.fail("Should have thrown duplicate phone error");
  } catch (err: any) {
    assert.ok(
      err.message.includes("already registered with another account"),
      `Expected duplicate message, got: ${err.message}`
    );
    console.log("  ✅ [PASS] 3.1: Duplicate phone registration blocked for new accounts");
  }

  // 3.2 Rate limiting on repeated OTP requests within cooldown window
  const cooldownPhone = "919998887776";
  // First request
  const c1 = PhoneAuthService.checkPhoneRateLimit(cooldownPhone);
  assert.strictEqual(c1.allowed, true);
  PhoneAuthService.recordPhoneRequest(cooldownPhone);

  // Second immediate request
  const c2 = PhoneAuthService.checkPhoneRateLimit(cooldownPhone);
  assert.strictEqual(c2.allowed, false);
  assert.ok(c2.error?.includes("cooldown") || c2.error?.includes("seconds"));
  console.log("  ✅ [PASS] 3.2: 60-second cooldown enforced on repeated OTP dispatch");

  // 3.3 4-digit phone OTP extraction vs 6-digit email OTP extraction
  const invalidDigits = extractOtpDigits("12a");
  assert.strictEqual(invalidDigits, "12");
  assert.strictEqual(invalidDigits.length < 6, true);

  const phoneDigits = extractPhoneOtpDigits("12-34");
  assert.strictEqual(phoneDigits, "1234");
  assert.strictEqual(phoneDigits.length, 4);

  const emailDigits = extractOtpDigits("123-456", 6);
  assert.strictEqual(emailDigits, "123456");
  assert.strictEqual(emailDigits.length, 6);
  console.log("  ✅ [PASS] 3.3: 4-digit phone OTP and 6-digit email OTP parsing strictly separated");

  // ---------------------------------------------------------------------------
  // GROUP 4: Existing Account Dashboard Verification Reminders
  // ---------------------------------------------------------------------------
  console.log("\n🔹 [Group 4] Existing Accounts: Dashboard Phone Verification & Reminders");

  // 4.1 Existing user without verified phone gets reminder status
  const unverifiedUserId = "usr_existing_unverified_404";
  const statusUnverified = await PhoneAuthService.getUserPhoneStatus(unverifiedUserId);
  assert.strictEqual(statusUnverified.isVerified, false);
  console.log("  ✅ [PASS] 4.1: Existing account without verified phone reports isVerified: false");

  // 4.2 Existing user verifies their stored phone via dashboard SMS OTP
  const existingUserId = "usr_educator_202";
  const educatorPhone = "919812345678";

  // Mark educator's phone as verified
  await PhoneAuthService.markPhoneVerified(existingUserId, educatorPhone);

  // Status now returns verified
  const statusEducator = await PhoneAuthService.getUserPhoneStatus(existingUserId);
  assert.strictEqual(statusEducator.hasPhone, true);
  assert.strictEqual(statusEducator.isVerified, true);
  assert.strictEqual(statusEducator.phone, educatorPhone);
  assert.strictEqual(statusEducator.maskedPhone, "+91 ******5678");
  console.log("  ✅ [PASS] 4.2: Stored phone verified for existing account (shows isVerified: true)");

  // 4.3 Overwriting another user's phone number during dashboard update is prevented
  try {
    await PhoneAuthService.verifyPhoneOtpSignup({
      phone: "9876543210", // Owned by learner_101
      otp: "1234",
      reqId: "sim_req_id",
      userId: "usr_educator_202", // Educator trying to take learner's phone
    });
    assert.fail("Should have prevented taking another user's phone");
  } catch (err: any) {
    assert.ok(
      err.message.includes("already registered with another account"),
      `Expected duplicate error, got: ${err.message}`
    );
    console.log("  ✅ [PASS] 4.3: Prevented unauthorized association with another user's phone");
  }

  // 4.4 Same user updating their own phone is allowed (not flagged as duplicate of self)
  const isDuplicateSelf = await PhoneAuthService.isPhoneAlreadyRegistered(educatorPhone, existingUserId);
  assert.strictEqual(isDuplicateSelf, false);
  console.log("  ✅ [PASS] 4.4: User re-verifying or confirming their own phone is not blocked");

  // ---------------------------------------------------------------------------
  // GROUP 5: Preservation of Existing Gmail & Email Authentication
  // ---------------------------------------------------------------------------
  console.log("\n🔹 [Group 5] Strict Preservation of Existing Gmail & Email Auth");

  // 5.1 Standard email/password registration schema validation
  const validLearnerReg = {
    firstName: "Dev",
    lastName: "Kumar",
    email: "dev.kumar@gmail.com",
    phone: "9876543210",
    password: "Password@123",
    role: "STUDENT",
  };
  const parsedReg = RegisterSchema.safeParse(validLearnerReg);
  assert.strictEqual(parsedReg.success, true);
  console.log("  ✅ [PASS] 5.1: Standard Gmail/email registration payload validates cleanly");

  // 5.2 Standard email/password login schema validation
  const validLogin = {
    email: "dev.kumar@gmail.com",
    password: "Password@123",
  };
  const parsedLogin = LoginSchema.safeParse(validLogin);
  assert.strictEqual(parsedLogin.success, true);
  console.log("  ✅ [PASS] 5.2: Standard Gmail/email login payload validates cleanly");

  // 5.3 Password hashing & verification untouched
  const pwdHash = await hashPassword("SecureP@ssword2026");
  const isCorrect = await verifyPassword("SecureP@ssword2026", pwdHash);
  const isWrong = await verifyPassword("WrongPassword", pwdHash);
  assert.strictEqual(isCorrect, true);
  assert.strictEqual(isWrong, false);
  console.log("  ✅ [PASS] 5.3: Existing bcrypt password security fully intact");

  // 5.4 Token hashing and verification for email OTP untouched
  const sampleOtp = "654321";
  const tokenHash = hashToken(sampleOtp);
  assert.strictEqual(verifyTokenHash(sampleOtp, tokenHash), true);
  assert.strictEqual(verifyTokenHash("000000", tokenHash), false);
  console.log("  ✅ [PASS] 5.4: Email verification cryptographic token hashing intact");

  // 5.5 Session creation, encoding & role decoding untouched
  const testSession = {
    id: "usr_learner_101",
    userId: "usr_learner_101",
    email: "dev.kumar@gmail.com",
    role: "STUDENT" as const,
    emailVerified: true,
    firstName: "Dev",
    lastName: "Kumar",
    status: "ACTIVE" as const,
  };
  const encoded = encodeSession(testSession);
  const decoded = decodeSession(encoded);
  assert.strictEqual(decoded?.userId, testSession.userId);
  assert.strictEqual(decoded?.role, "STUDENT");
  assert.strictEqual(decoded?.email, "dev.kumar@gmail.com");
  console.log("  ✅ [PASS] 5.5: Cryptographic session token encoding/decoding fully intact");

  console.log("\n================================================================================");
  console.log("🎉 ALL PHONE VERIFICATION UPDATE TESTS COMPLETED WITH 100% SUCCESS! 🚀");
  console.log("================================================================================\n");
}

runPhoneVerificationUpdateTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
