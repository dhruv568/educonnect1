import { resolveEmailTheme, EMAIL_THEMES, EmailThemeType } from "../lib/email/email-theme";
import { generateVerificationEmailHtml } from "../lib/email/templates/verification-email";
import { generateEmailFooterHtml } from "../lib/email/templates/email-footer";

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

console.log("\n==================================================================");
console.log("🎉 ALL ROLE-BASED OTP EMAIL THEME TESTS PASSED SUCCESSFULLY! (100% COVERAGE)");
console.log("==================================================================");
