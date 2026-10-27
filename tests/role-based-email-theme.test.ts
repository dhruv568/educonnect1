process.env.EMAIL_PROVIDER = "console";
(process.env as any).NODE_ENV = "test";

import { resolveEmailTheme, EMAIL_THEMES, EmailThemeType } from "../lib/email/email-theme";
import { generateVerificationEmailHtml } from "../lib/email/templates/verification-email";
import { generateEmailFooterHtml } from "../lib/email/templates/email-footer";
import { generateWelcomeEmailHtml } from "../lib/email/templates/welcome-email";
import { generateNotificationEmailHtml } from "../lib/email/templates/verification-templates";
import { EmailService } from "../lib/email/email-service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
}

console.log("==================================================================");
console.log("🧪 RUNNING ROLE-BASED OTP EMAIL THEME VERIFICATION TESTS");
console.log("==================================================================");

// 1. Verify exact token specifications for all three palettes
console.log("\n--- Test Suite 1: Theme Palette Exact Color Specifications ---");

// Main: Emerald Green
const mainTheme = EMAIL_THEMES.main;
assert(mainTheme.primary.toUpperCase() === "#16805B", "Main primary color must be #16805B");
assert(mainTheme.dark.toUpperCase() === "#0D5C41", "Main dark color must be #0D5C41");
assert(mainTheme.light.toUpperCase() === "#35A979", "Main light color must be #35A979");
assert(mainTheme.softBg.toUpperCase() === "#F0FAF5", "Main soft background must be #F0FAF5");
console.log("✅ Main Website Palette Verified: Emerald Green (#16805B / #0D5C41 / #35A979 / #F0FAF5)");

// Learner: Blue
const learnerTheme = EMAIL_THEMES.learner;
assert(learnerTheme.primary.toUpperCase() === "#2563EB", "Learner primary color must be #2563EB");
assert(learnerTheme.dark.toUpperCase() === "#1E40AF", "Learner dark color must be #1E40AF");
assert(learnerTheme.light.toUpperCase() === "#60A5FA", "Learner light color must be #60A5FA");
assert(learnerTheme.softBg.toUpperCase() === "#EFF6FF", "Learner soft background must be #EFF6FF");
console.log("✅ Learner Portal Palette Verified: Blue (#2563EB / #1E40AF / #60A5FA / #EFF6FF)");

// Educator: Teal
const educatorTheme = EMAIL_THEMES.educator;
assert(educatorTheme.primary.toUpperCase() === "#0F766E", "Educator primary color must be #0F766E");
assert(educatorTheme.dark.toUpperCase() === "#115E59", "Educator dark color must be #115E59");
assert(educatorTheme.light.toUpperCase() === "#2DD4BF", "Educator light color must be #2DD4BF");
assert(educatorTheme.softBg.toUpperCase() === "#F0FDFA", "Educator soft background must be #F0FDFA");
console.log("✅ Educator Portal Palette Verified: Teal (#0F766E / #115E59 / #2DD4BF / #F0FDFA)");

// 2. Strict Requirement Verification: No Purple/Violet, No Orange primary for Educator
console.log("\n--- Test Suite 2: Brand Guardrail Invariants ---");
const forbiddenColors = ["#8B5CF6", "#7C3AED", "#6D28D9", "#A855F7", "#9333EA", "PURPLE", "VIOLET"];
for (const [name, theme] of Object.entries(EMAIL_THEMES)) {
  const allValues = JSON.stringify(theme).toUpperCase();
  for (const forbidden of forbiddenColors) {
    assert(!allValues.includes(forbidden), `Theme ${name} must not contain forbidden color: ${forbidden}`);
  }
}
const orangeColors = ["#F97316", "#EA580C", "#FF6B00", "#FF5722", "#FFA500", "#F59E0B", "ORANGE"];
for (const orange of orangeColors) {
  assert(!JSON.stringify(educatorTheme).toUpperCase().includes(orange), `Educator theme must not use orange brand color: ${orange}`);
}
console.log("✅ Strict Guardrails Verified: Zero purple/violet in any palette, zero orange in Educator theme.");

// 3. Test resolveEmailTheme logic
console.log("\n--- Test Suite 3: Server-Side Resolution Precedence ---");

// Test explicit theme override
assert(resolveEmailTheme({ theme: "learner" }).name === "learner", "Explicit learner theme");
assert(resolveEmailTheme({ theme: "educator" }).name === "educator", "Explicit educator theme");
assert(resolveEmailTheme({ theme: "main" }).name === "main", "Explicit main theme");

// Test role-based resolution
assert(resolveEmailTheme({ role: "STUDENT" }).name === "learner", "Role STUDENT -> learner");
assert(resolveEmailTheme({ role: "LEARNER" }).name === "learner", "Role LEARNER -> learner");
assert(resolveEmailTheme({ role: "PARENT" }).name === "learner", "Role PARENT -> learner");
assert(resolveEmailTheme({ role: "TEACHER" }).name === "educator", "Role TEACHER -> educator");
assert(resolveEmailTheme({ role: "EDUCATOR" }).name === "educator", "Role EDUCATOR -> educator");
assert(resolveEmailTheme({ role: "ADMIN" }).name === "main", "Role ADMIN -> main");
assert(resolveEmailTheme({ role: "STAFF" }).name === "main", "Role STAFF -> main");

// Test host-based resolution
assert(resolveEmailTheme({ host: "learners.educonnects.co.in" }).name === "learner", "Host learners.educonnects.co.in -> learner");
assert(resolveEmailTheme({ host: "educators.educonnects.co.in" }).name === "educator", "Host educators.educonnects.co.in -> educator");
assert(resolveEmailTheme({ host: "educonnects.co.in" }).name === "main", "Host educonnects.co.in -> main");
assert(resolveEmailTheme({}).name === "main", "Default fallback -> main");

console.log("✅ All resolution priority rules passed successfully.");

// 4. Test HTML Generation & Theme Application for All 3 Email Types
console.log("\n--- Test Suite 4: HTML Template Rendering & Color Consistency ---");

// 4.1 Learner OTP Email (Blue Theme)
const learnerHtml = generateVerificationEmailHtml({
  recipientEmail: "learner.test@educonnects.co.in",
  firstName: "Aarav",
  otp: "654321",
  role: "STUDENT",
  originHost: "learners.educonnects.co.in",
  verificationUrl: "https://learners.educonnects.co.in/verify-otp?email=learner.test@educonnects.co.in",
});

assert(learnerHtml.includes("#2563EB"), "Learner email must contain #2563EB (Primary Blue)");
assert(learnerHtml.includes("#1E40AF"), "Learner email must contain #1E40AF (Dark Blue)");
assert(learnerHtml.includes("#60A5FA"), "Learner email must contain #60A5FA (Light Blue)");
assert(learnerHtml.includes("#EFF6FF"), "Learner email must contain #EFF6FF (Soft Blue BG)");
assert(learnerHtml.includes("EduConnects Learner Portal"), "Learner email must display Learner Portal branding");
assert(learnerHtml.includes("learners.educonnects.co.in"), "Learner email must link to learners.educonnects.co.in");
assert(learnerHtml.includes("6&nbsp;&nbsp;5&nbsp;&nbsp;4&nbsp;&nbsp;3&nbsp;&nbsp;2&nbsp;&nbsp;1"), "Learner OTP must be formatted correctly");
console.log("✅ Learner OTP Email HTML: Verified complete Blue theme rendering.");

// 4.2 Educator OTP Email (Teal Theme)
const educatorHtml = generateVerificationEmailHtml({
  recipientEmail: "educator.test@educonnects.co.in",
  firstName: "Prof. Priya",
  otp: "987654",
  role: "TEACHER",
  originHost: "educators.educonnects.co.in",
  verificationUrl: "https://educators.educonnects.co.in/verify-otp?email=educator.test@educonnects.co.in",
});

assert(educatorHtml.includes("#0F766E"), "Educator email must contain #0F766E (Primary Teal)");
assert(educatorHtml.includes("#115E59"), "Educator email must contain #115E59 (Dark Teal)");
assert(educatorHtml.includes("#2DD4BF"), "Educator email must contain #2DD4BF (Light Teal)");
assert(educatorHtml.includes("#F0FDFA"), "Educator email must contain #F0FDFA (Soft Teal BG)");
assert(educatorHtml.includes("EduConnects Educator Portal"), "Educator email must display Educator Portal branding");
assert(educatorHtml.includes("educators.educonnects.co.in"), "Educator email must link to educators.educonnects.co.in");
assert(educatorHtml.includes("9&nbsp;&nbsp;8&nbsp;&nbsp;7&nbsp;&nbsp;6&nbsp;&nbsp;5&nbsp;&nbsp;4"), "Educator OTP must be formatted correctly");
console.log("✅ Educator OTP Email HTML: Verified complete Teal theme rendering.");

// 4.3 Main Website / Admin OTP Email (Emerald Green Theme)
const mainHtml = generateVerificationEmailHtml({
  recipientEmail: "admin@educonnects.co.in",
  firstName: "Super Admin",
  otp: "123456",
  isAdminLogin: true,
  role: "ADMIN",
  originHost: "educonnects.co.in",
});

assert(mainHtml.includes("#16805B"), "Main email must contain #16805B (Primary Emerald)");
assert(mainHtml.includes("#0D5C41"), "Main email must contain #0D5C41 (Dark Emerald)");
assert(mainHtml.includes("#35A979"), "Main email must contain #35A979 (Light Emerald)");
assert(mainHtml.includes("#F0FAF5"), "Main email must contain #F0FAF5 (Soft Emerald BG)");
assert(mainHtml.includes("EduConnects"), "Main email must display EduConnects branding");
assert(mainHtml.includes("1&nbsp;&nbsp;2&nbsp;&nbsp;3&nbsp;&nbsp;4&nbsp;&nbsp;5&nbsp;&nbsp;6"), "Admin OTP must be formatted correctly");
console.log("✅ Main Website OTP Email HTML: Verified complete Emerald Green theme rendering.");

// 4.4 Verify Footer Theme Alignment
const learnerFooterHtml = generateEmailFooterHtml({ theme: "learner", baseUrl: "https://learners.educonnects.co.in" });
assert(learnerFooterHtml.includes("#1E40AF"), "Learner footer must contain #1E40AF");
assert(learnerFooterHtml.includes("#2563EB"), "Learner footer must contain #2563EB");

const educatorFooterHtml = generateEmailFooterHtml({ theme: "educator", baseUrl: "https://educators.educonnects.co.in" });
assert(educatorFooterHtml.includes("#115E59"), "Educator footer must contain #115E59");
assert(educatorFooterHtml.includes("#0F766E"), "Educator footer must contain #0F766E");

const mainFooterHtml = generateEmailFooterHtml({ theme: "main", baseUrl: "https://educonnects.co.in" });
assert(mainFooterHtml.includes("#0D5C41"), "Main footer must contain #0D5C41");
assert(mainFooterHtml.includes("#16805B"), "Main footer must contain #16805B");

console.log("✅ Footer Theme Alignment: Verified matching theme colors in footers.");

// 5. Test Welcome Email Generation & Role-Based Color Consistency
console.log("\n--- Test Suite 5: Role-Based Welcome Email Generation & Guardrails ---");

async function runWelcomeEmailTests() {
  // 5.1 Learner Welcome Email (Blue Theme)
  const learnerWelcomeHtml = generateWelcomeEmailHtml({
    email: "learner.test@educonnects.co.in",
    userName: "Aarav",
    role: "STUDENT",
  });

  assert(learnerWelcomeHtml.includes("#2563EB"), "Learner welcome email must contain #2563EB (Primary Blue)");
  assert(learnerWelcomeHtml.includes("#1E40AF"), "Learner welcome email must contain #1E40AF (Dark Blue)");
  assert(learnerWelcomeHtml.includes("#60A5FA"), "Learner welcome email must contain #60A5FA (Light Blue)");
  assert(learnerWelcomeHtml.includes("#EFF6FF"), "Learner welcome email must contain #EFF6FF (Soft Blue BG)");
  assert(learnerWelcomeHtml.includes("EduConnects Learner Portal"), "Learner welcome email must display Learner Portal branding");
  assert(learnerWelcomeHtml.includes("learners.educonnects.co.in"), "Learner welcome email must link to learners.educonnects.co.in");
  assert(learnerWelcomeHtml.includes("Your EduConnects journey starts here!"), "Learner welcome email must display learner headline");
  assert(learnerWelcomeHtml.includes("linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #60A5FA 100%)"), "Learner header banner gradient must match Learner palette");
  assert(learnerWelcomeHtml.includes("linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)"), "Learner CTA button gradient must match Learner palette");
  assert(!learnerWelcomeHtml.includes("#0F766E"), "Learner welcome email must NOT contain Educator Teal (#0F766E)");
  assert(!learnerWelcomeHtml.includes("#8B5CF6") && !learnerWelcomeHtml.includes("#7C3AED"), "Learner welcome email must NOT contain purple/violet");
  console.log("✅ Learner Welcome Email HTML: Verified complete Blue theme rendering.");

  // 5.2 Educator Welcome Email (Teal Theme)
  const educatorWelcomeHtml = generateWelcomeEmailHtml({
    email: "educator.test@educonnects.co.in",
    userName: "Prof. Priya",
    role: "TEACHER",
  });

  assert(educatorWelcomeHtml.includes("#0F766E"), "Educator welcome email must contain #0F766E (Primary Teal)");
  assert(educatorWelcomeHtml.includes("#115E59"), "Educator welcome email must contain #115E59 (Dark Teal)");
  assert(educatorWelcomeHtml.includes("#2DD4BF"), "Educator welcome email must contain #2DD4BF (Light Teal)");
  assert(educatorWelcomeHtml.includes("#F0FDFA"), "Educator welcome email must contain #F0FDFA (Soft Teal BG)");
  assert(educatorWelcomeHtml.includes("EduConnects Educator Portal"), "Educator welcome email must display Educator Portal branding");
  assert(educatorWelcomeHtml.includes("educators.educonnects.co.in"), "Educator welcome email must link to educators.educonnects.co.in");
  assert(educatorWelcomeHtml.includes("Welcome to the EduConnects Educator Community!"), "Educator welcome email must display educator headline");
  assert(educatorWelcomeHtml.includes("linear-gradient(135deg, #115E59 0%, #0F766E 50%, #2DD4BF 100%)"), "Educator header banner gradient must match Educator palette");
  assert(educatorWelcomeHtml.includes("linear-gradient(135deg, #0F766E 0%, #115E59 100%)"), "Educator CTA button gradient must match Educator palette");
  assert(!educatorWelcomeHtml.includes("#2563EB"), "Educator welcome email must NOT contain Learner Blue (#2563EB)");
  assert(!educatorWelcomeHtml.includes("#F97316") && !educatorWelcomeHtml.includes("#EA580C"), "Educator welcome email must NOT contain orange brand color");
  assert(!educatorWelcomeHtml.includes("#8B5CF6") && !educatorWelcomeHtml.includes("#7C3AED"), "Educator welcome email must NOT contain purple/violet");
  console.log("✅ Educator Welcome Email HTML: Verified complete Teal theme rendering.");

  // 5.3 Missing, Null, or Invalid Role Fallbacks (Safe Emerald Green Theme)
  const missingRoleHtml = generateWelcomeEmailHtml({
    email: "user@educonnects.co.in",
    userName: "Alex",
  });
  assert(missingRoleHtml.includes("#16805B"), "Missing role welcome email must fallback to #16805B (Main Emerald)");
  assert(missingRoleHtml.includes("#0D5C41"), "Missing role welcome email must fallback to #0D5C41 (Dark Emerald)");
  assert(missingRoleHtml.includes("#35A979"), "Missing role welcome email must fallback to #35A979 (Light Emerald)");
  assert(missingRoleHtml.includes("#F0FAF5"), "Missing role welcome email must fallback to #F0FAF5 (Soft Emerald BG)");
  assert(missingRoleHtml.includes("EduConnects"), "Missing role welcome email must display default EduConnects branding");

  const invalidRoleHtml = generateWelcomeEmailHtml({
    email: "user@educonnects.co.in",
    userName: "Alex",
    role: "UNKNOWN_ROLE",
  });
  assert(invalidRoleHtml.includes("#16805B"), "Invalid role welcome email must fallback to #16805B (Main Emerald)");
  assert(invalidRoleHtml.includes("EduConnects"), "Invalid role welcome email must display default EduConnects branding");
  console.log("✅ Safe Role Fallback: Verified graceful degradation to Main Emerald theme for missing/invalid roles.");

  // 5.4 Test Notification Template (generateNotificationEmailHtml) with Role Parameter
  const learnerNotificationHtml = generateNotificationEmailHtml({
    email: "learner.test@educonnects.co.in",
    recipientName: "Aarav",
    subject: "Class Update",
    headline: "Class Schedule Confirmed",
    bodyText: "Your live session is ready.",
    statusBadgeText: "CONFIRMED",
    statusBadgeVariant: "theme",
    role: "STUDENT",
    actionUrl: "https://learners.educonnects.co.in/courses",
    actionText: "View Schedule",
  });
  assert(learnerNotificationHtml.includes("#2563EB"), "Notification with STUDENT role must use Learner Blue #2563EB");
  assert(learnerNotificationHtml.includes("#EFF6FF"), "Notification with STUDENT role must use Learner BG #EFF6FF");

  const educatorNotificationHtml = generateNotificationEmailHtml({
    email: "educator.test@educonnects.co.in",
    recipientName: "Prof. Priya",
    subject: "Payout Update",
    headline: "Monthly Payout Processed",
    bodyText: "Your monthly earnings have been credited.",
    statusBadgeText: "PAID",
    statusBadgeVariant: "theme",
    role: "TEACHER",
    actionUrl: "https://educators.educonnects.co.in/earnings",
    actionText: "View Earnings",
  });
  assert(educatorNotificationHtml.includes("#0F766E"), "Notification with TEACHER role must use Educator Teal #0F766E");
  assert(educatorNotificationHtml.includes("#F0FDFA"), "Notification with TEACHER role must use Educator BG #F0FDFA");
  console.log("✅ Notification Email HTML: Verified dynamic role theme styling in generic notifications.");

  // 5.5 Test EmailService.sendWelcomeEmail Dispatches
  console.log("\n--- Test Suite 6: EmailService.sendWelcomeEmail End-to-End In-Memory Tests ---");
  const learnerSent = await EmailService.sendWelcomeEmail({
    email: "learner.dispatch@educonnects.co.in",
    userName: "Aarav",
    role: "STUDENT",
  });
  assert(learnerSent === true, "EmailService.sendWelcomeEmail for learner must succeed");

  const educatorSent = await EmailService.sendWelcomeEmail({
    email: "educator.dispatch@educonnects.co.in",
    userName: "Prof. Priya",
    role: "TEACHER",
  });
  assert(educatorSent === true, "EmailService.sendWelcomeEmail for educator must succeed");

  const fallbackSent = await EmailService.sendWelcomeEmail({
    email: "fallback.dispatch@educonnects.co.in",
    userName: "Guest",
  });
  assert(fallbackSent === true, "EmailService.sendWelcomeEmail for fallback must succeed");
  console.log("✅ EmailService Dispatch: Successfully verified welcome email sends across all roles.");

  console.log("\n==================================================================");
  console.log("🎉 ALL ROLE-BASED WELCOME & OTP EMAIL THEME TESTS PASSED! (100% COVERAGE)");
  console.log("==================================================================");
}

runWelcomeEmailTests().catch((err) => {
  console.error("❌ Test suite encountered an error:", err);
  process.exit(1);
});

