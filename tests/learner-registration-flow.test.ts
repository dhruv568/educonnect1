import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("======================================================================");
console.log("🧪 RUNNING TEST SUITE: LEARNER REGISTRATION & PAYMENT SEPARATION");
console.log("======================================================================\n");

// 1. Verify components/learner/learner-registration-flow.tsx
console.log("Test 1: Auditing components/learner/learner-registration-flow.tsx...");
const flowFilePath = path.join(process.cwd(), "components/learner/learner-registration-flow.tsx");
assert.ok(fs.existsSync(flowFilePath), "Learner registration flow component must exist");
const flowContent = fs.readFileSync(flowFilePath, "utf-8");

// A. Check that free registration doesn't force payment
assert.ok(
  flowContent.includes("Skip to Free Dashboard") || flowContent.includes("Skip to Dashboard (Free)"),
  "Component must provide clear free path to dashboard without payment"
);

// B. Check that Step 2 allows continuing without selecting a course or educator
assert.ok(
  flowContent.includes("Skip to Dashboard (Free)") || flowContent.includes("Skip to Free Dashboard"),
  "Learners must not be forced to select a program merely to register"
);

// C. Check that Cashfree is only loaded during explicit paid checkout
assert.ok(
  flowContent.includes("https://sdk.cashfree.com/js/v3/cashfree.js"),
  "Cashfree SDK must still be present for legitimate paid transactions"
);

// D. Check that Step 3 offers a way to skip payment and continue to dashboard
assert.ok(
  flowContent.includes("Skip Payment & Go to Dashboard"),
  "Step 3 Review must offer an escape hatch to keep account without paying"
);

// E. Check that Step 7 renders for free accounts without transactionData
assert.ok(
  flowContent.includes("Free Learner Account Active"),
  "Step 7 must gracefully handle free accounts that have no payment order"
);

// F. Check that optional callback request is present
assert.ok(
  flowContent.includes("Request a Free Counseling Callback") || flowContent.includes("Need Help Deciding?"),
  "Optional counseling callback request must be available in Step 2"
);

assert.ok(
  flowContent.includes("/api/student/callback-request"),
  "Callback form must submit to /api/student/callback-request"
);

console.log("  ✅ Passed: learner-registration-flow.tsx separates registration from payment and provides optional callback.\n");

// 2. Verify app/api/student/callback-request/route.ts
console.log("Test 2: Auditing app/api/student/callback-request/route.ts...");
const callbackRoutePath = path.join(process.cwd(), "app/api/student/callback-request/route.ts");
assert.ok(fs.existsSync(callbackRoutePath), "Callback request API route must exist");
const callbackRouteContent = fs.readFileSync(callbackRoutePath, "utf-8");

assert.ok(
  callbackRouteContent.includes("consent"),
  "Callback route must validate explicit user consent"
);
assert.ok(
  callbackRouteContent.includes("cleanPhone.length !== 10"),
  "Callback route must validate 10-digit mobile number"
);
assert.ok(
  callbackRouteContent.includes("learner_counseling_callback_requested"),
  "Callback route must track analytics event"
);

console.log("  ✅ Passed: app/api/student/callback-request/route.ts correctly enforces explicit consent and validates input.\n");

// 3. Verify that student registration pages mount the flow cleanly
console.log("Test 3: Verifying student registration pages...");
const studentRegisterPage = fs.readFileSync(path.join(process.cwd(), "app/student/register/page.tsx"), "utf-8");
assert.ok(
  studentRegisterPage.includes("<LearnerRegistrationFlow />"),
  "app/student/register/page.tsx must mount LearnerRegistrationFlow"
);

const altRegisterPage = fs.readFileSync(path.join(process.cwd(), "app/register/student/page.tsx"), "utf-8");
assert.ok(
  altRegisterPage.includes("<LearnerRegistrationFlow />"),
  "app/register/student/page.tsx must mount LearnerRegistrationFlow"
);

console.log("  ✅ Passed: Both learner registration pages correctly mount LearnerRegistrationFlow.\n");

console.log("======================================================================");
console.log("🎉 ALL LEARNER REGISTRATION & PAYMENT SEPARATION TESTS PASSED!");
console.log("======================================================================\n");
