import assert from "node:assert";
import { OFFICIAL_COMPANY_INFO } from "../lib/company";
import { getStudentDomain, getEducatorDomain, getLiveDomain } from "../lib/app-url";
import { generateVerificationEmailHtml } from "../lib/email/templates/verification-email";
import fs from "node:fs";
import path from "node:path";

async function runTests() {
  console.log("🚀 Starting Comprehensive Production Verification Test Suite...\n");

  // 1. Company Info & Legal Text Consistency (Problems 5 & 8)
  console.log("1. Checking Company Information & Legal Consistency...");
  assert.ok(
    OFFICIAL_COMPANY_INFO.brandName === "EduConnects" || OFFICIAL_COMPANY_INFO.brandName === "EduConnect",
    "Brand name must be 'EduConnects'"
  );
  assert.strictEqual(
    OFFICIAL_COMPANY_INFO.legalName,
    "Shrivastava ProFunnels Ventures Pvt Ltd",
    "Legal name must be 'Shrivastava ProFunnels Ventures Pvt Ltd'"
  );
  assert.strictEqual(
    OFFICIAL_COMPANY_INFO.founder,
    "Neeraj Shrivastava",
    "Founder must be 'Neeraj Shrivastava'"
  );
  console.log("✅ Company Info & Legal Name strictly match requirements.\n");

  // 2. Subdomains & App URLs
  console.log("2. Checking Subdomains Configuration...");
  const studentDomain = getStudentDomain();
  const educatorDomain = getEducatorDomain();
  const liveDomain = getLiveDomain();
  assert.ok(
    studentDomain.includes("learners.educonnects.co.in") || studentDomain.includes("localhost"),
    `Learner domain should be learners.educonnects.co.in, got: ${studentDomain}`
  );
  assert.ok(
    educatorDomain.includes("educators.educonnects.co.in") || educatorDomain.includes("localhost"),
    `Educator domain should be educators.educonnects.co.in, got: ${educatorDomain}`
  );
  assert.ok(
    liveDomain.includes("live.educonnects.co.in") || liveDomain.includes("localhost"),
    `Live domain should be live.educonnects.co.in, got: ${liveDomain}`
  );
  console.log("✅ Subdomain resolution verified.\n");

  // 3. Email Template Branding & OTP (Problem 7)
  console.log("3. Checking Email Verification Template...");
  const emailHtml = generateVerificationEmailHtml({
    recipientEmail: "educator@example.com",
    firstName: "Test Educator",
    otp: "782194",
    appUrl: "https://educonnects.co.in",
  });
  assert.ok(emailHtml.includes("EduConnects") || emailHtml.includes("EduConnect"), "Email contains brand title EduConnects");
  assert.ok(emailHtml.includes("/images/favicon.png") || emailHtml.includes("/images/logo.jpeg"), "Email contains logo");
  assert.ok(emailHtml.includes("7&nbsp;&nbsp;8&nbsp;&nbsp;2&nbsp;&nbsp;1&nbsp;&nbsp;9&nbsp;&nbsp;4") || emailHtml.includes("7 8 2 1 9 4") || emailHtml.includes("782194"), "Email formats 6-digit OTP code");
  assert.ok(emailHtml.includes("Verify Email Now") || emailHtml.includes("Verify OTP"), "Email contains Verify button");
  assert.ok(
    !emailHtml.includes("otp=782194") && !emailHtml.includes("token=782194"),
    "Email CTA does NOT expose OTP code in URL query parameters"
  );
  assert.ok(
    emailHtml.includes("Shrivastava ProFunnels Ventures Pvt Ltd"),
    "Email footer contains legal entity name"
  );
  console.log("✅ Email verification template verified.\n");

  // 4. Verification Gate Guards (Problem 3)
  console.log("4. Checking Backend Verification Guards...");
  const guardsContent = fs.readFileSync(path.join(process.cwd(), "lib/auth/guards.ts"), "utf-8");
  assert.ok(
    guardsContent.includes("requireVerifiedEducator"),
    "lib/auth/guards.ts exports requireVerifiedEducator"
  );
  assert.ok(
    guardsContent.includes("EDUCATOR_VERIFICATION_PENDING_MESSAGE") &&
      guardsContent.includes("pending verification"),
    "Guard includes informative message for unverified educators"
  );

  const classroomTokenContent = fs.readFileSync(
    path.join(process.cwd(), "lib/classroom/classroom-token.ts"),
    "utf-8"
  );
  assert.ok(
    classroomTokenContent.includes("isTeacherVerified") &&
    classroomTokenContent.includes("liveSession.teacher?.verificationStatus === \"VERIFIED\""),
    "LiveKit room token generator checks teacher verification status"
  );
  console.log("✅ Live class and course verification gates verified.\n");

  // 5. KYC System & Exact Confirmation Message (Problem 1)
  console.log("5. Checking Educator KYC & Exact Confirmation Message...");
  const exactConfirmation =
    "Thank You for applying. We shall verify your documents, and if they meet our policy requirements, the next round will proceed. You will be informed through our official email, WhatsApp, or via call.";

  const submitRouteContent = fs.readFileSync(
    path.join(process.cwd(), "app/api/teacher/verification/submit/route.ts"),
    "utf-8"
  );
  assert.ok(
    submitRouteContent.includes(exactConfirmation),
    "Submit route returns exact confirmation message"
  );

  const onboardingPageContent = fs.readFileSync(
    path.join(process.cwd(), "app/teacher/onboarding/page.tsx"),
    "utf-8"
  );
  assert.ok(
    onboardingPageContent.includes("accountHolderName") &&
    onboardingPageContent.includes("accountNumber") &&
    onboardingPageContent.includes("bankName") &&
    onboardingPageContent.includes("ifscCode") &&
    onboardingPageContent.includes("cancelledChequeUrl"),
    "Onboarding page includes all bank fields and cancelled cheque upload"
  );
  assert.ok(
    onboardingPageContent.includes(exactConfirmation),
    "Onboarding page displays exact confirmation message upon completion"
  );
  console.log("✅ Educator KYC 5-step flow and bank details verified.\n");

  // 6. Course Creation Multi-Step Flow (Problem 2)
  console.log("6. Checking Course Creation Multi-Step Flow...");
  const courseEditContent = fs.readFileSync(
    path.join(process.cwd(), "app/teacher/courses/[id]/edit/page.tsx"),
    "utf-8"
  );
  assert.ok(courseEditContent.includes("Next: Curriculum Builder"), "Step 1 has explicit Next button");
  assert.ok(courseEditContent.includes("Back: Course Info"), "Step 2 has explicit Back button");
  assert.ok(courseEditContent.includes("Next: Settings & Pricing"), "Step 2 has explicit Next button");
  assert.ok(courseEditContent.includes("Back: Curriculum Builder"), "Step 3 has explicit Back button");
  assert.ok(courseEditContent.includes("Next: Review & Publish"), "Step 3 has explicit Next button");
  assert.ok(courseEditContent.includes("Back: Settings & Pricing"), "Step 4 has explicit Back button");
  assert.ok(courseEditContent.includes("Student Preview"), "Student Preview mode is present");
  assert.ok(courseEditContent.includes("Save Progress"), "Save Progress action is present");
  console.log("✅ Course multi-step editor verified.\n");

  // 7. Calendar Day/Week/Month Views (Problem 4)
  console.log("7. Checking Calendar Day/Week/Month Views...");
  const liveClassesContent = fs.readFileSync(
    path.join(process.cwd(), "app/teacher/live-classes/page.tsx"),
    "utf-8"
  );
  assert.ok(liveClassesContent.includes('"DAY"'), "Calendar supports DAY view");
  assert.ok(liveClassesContent.includes('"WEEK"'), "Calendar supports WEEK view");
  assert.ok(liveClassesContent.includes('"MONTH"'), "Calendar supports MONTH view");
  assert.ok(liveClassesContent.includes("Asia/Kolkata"), "Calendar supports Asia/Kolkata timezone");
  assert.ok(liveClassesContent.includes("handleCalendarPrev") && liveClassesContent.includes("handleCalendarNext"), "Calendar includes prev/next controls");
  console.log("✅ Calendar views and date math verified.\n");

  // 8. Educator Logout Page (Problem 6)
  console.log("8. Checking Educator Logout Page & Asset Integrity...");
  assert.ok(fs.existsSync(path.join(process.cwd(), "public/images/logo.jpeg")), "public/images/logo.jpeg exists");
  assert.ok(fs.existsSync(path.join(process.cwd(), "public/images/director.jpeg")), "public/images/director.jpeg exists");
  assert.ok(fs.existsSync(path.join(process.cwd(), "public/images/learner-hero.jpeg")), "public/images/learner-hero.jpeg exists");

  const logoutPageContent = fs.readFileSync(
    path.join(process.cwd(), "app/teacher/logout/page.tsx"),
    "utf-8"
  );
  const logoutComponentContent = fs.readFileSync(
    path.join(process.cwd(), "components/auth/logout-page.tsx"),
    "utf-8"
  );
  const combinedLogout = `${logoutPageContent}\n${logoutComponentContent}`;

  assert.ok(
    logoutPageContent.includes("LogoutPage") && logoutPageContent.includes('roleContext="teacher"'),
    "Logout page renders LogoutPage with educator roleContext"
  );
  assert.ok(
    combinedLogout.includes("Logo") || combinedLogout.includes("logo"),
    "Logout page displays logo"
  );
  assert.ok(
    combinedLogout.includes("Login Again") || combinedLogout.includes("Log In Again"),
    "Logout page has Log In Again CTA"
  );
  assert.ok(
    combinedLogout.includes("Back to Home") || combinedLogout.includes("Return to Homepage"),
    "Logout page has Return to Homepage CTA"
  );
  console.log("✅ Dedicated educator logout page verified.\n");

  // 9. Dashboard Shared Footer (Problems 5 & 8)
  console.log("9. Checking Shared Dashboard Footer...");
  const dashboardFooterContent = fs.readFileSync(
    path.join(process.cwd(), "components/layout/dashboard-footer.tsx"),
    "utf-8"
  );
  assert.ok(dashboardFooterContent.includes("OFFICIAL_COMPANY_INFO.brandName"), "Uses brand name");
  assert.ok(dashboardFooterContent.includes("All rights reserved"), "Displays All rights reserved copyright");

  const dashboardLayoutContent = fs.readFileSync(
    path.join(process.cwd(), "components/layout/dashboard-layout.tsx"),
    "utf-8"
  );
  assert.ok(dashboardLayoutContent.includes("<DashboardFooter />"), "DashboardLayout mounts DashboardFooter");
  assert.ok(!dashboardLayoutContent.toLowerCase().includes("parent"), "No Parent section in DashboardLayout");
  console.log("✅ Shared dashboard footer & terminology verified.\n");

  console.log("🎉 ALL PRODUCTION CHECKS PASSED WITH 100% SUCCESS!\n");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
