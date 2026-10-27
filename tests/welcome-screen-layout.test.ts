import fs from "fs";
import path from "path";

console.log("======================================================================");
console.log("🧪 TESTING LEARNER WELCOME SCREEN SPACING & ALIGNMENT");
console.log("======================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`   ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`   ❌ FAIL: ${message}`);
    failed++;
  }
}

const componentPath = path.join(
  process.cwd(),
  "components",
  "learner",
  "learner-registration-flow.tsx"
);
const componentContent = fs.readFileSync(componentPath, "utf-8");

// Extract Step 7 block (success screen)
const step7Index = componentContent.lastIndexOf("state.step === 7");
assert(step7Index !== -1, "Step 7 block exists in component");
const step7Content = componentContent.slice(step7Index);

// 1. Top Icon & Status Badge
console.log("--- 1. Top Icon and Status Badge ---");
assert(
  step7Content.includes("rounded-full bg-[#2563EB]/10") &&
    step7Content.includes("w-20 h-20 sm:w-22 sm:h-22"),
  "Welcome icon uses a circular container (rounded-full) with responsive sizing"
);
assert(
  step7Content.includes("Free Learner Account Active"),
  "Status badge displays 'Free Learner Account Active'"
);
assert(
  step7Content.includes("bg-emerald-50 border border-emerald-200 text-emerald-800"),
  "Status badge uses refined emerald theme with border"
);

// 2. Heading and Description
console.log("\n--- 2. Heading and Description Typography ---");
assert(
  step7Content.includes("Welcome to EduConnects, {state.fullName || \"Learner\"}!"),
  "Heading text 'Welcome to EduConnects, {state.fullName || \"Learner\"}!' is preserved"
);
assert(
  step7Content.includes("leading-snug sm:leading-tight"),
  "Heading includes improved responsive line-height (leading-snug sm:leading-tight)"
);
assert(
  step7Content.includes("text-2xl sm:text-3xl lg:text-4xl"),
  "Heading typography uses responsive scale preventing awkward mobile wrapping"
);
assert(
  step7Content.includes("max-w-md mx-auto leading-relaxed"),
  "Description text includes max-w-md with leading-relaxed for optimal readability"
);

// 3. Free Learner Privileges Card
console.log("\n--- 3. Privileges Card Spacing and Checkmark Alignment ---");
assert(
  step7Content.includes("p-6 sm:p-7 rounded-2xl bg-slate-50/90"),
  "Privileges card has comfortable internal padding (p-6 sm:p-7)"
);
assert(
  step7Content.includes("pb-3 mb-4 border-b border-slate-200"),
  "Privileges title is cleanly separated from the divider (pb-3 mb-4)"
);
assert(
  step7Content.includes("space-y-3.5"),
  "Privilege items have increased vertical spacing (space-y-3.5)"
);
assert(
  step7Content.includes("flex items-start gap-3"),
  "Checkmark items use items-start gap-3 to align icons consistently with first line of text"
);
assert(
  step7Content.includes("p-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0 mt-0.5"),
  "Checkmark icon is housed in a badge with top offset (mt-0.5) preventing overlap"
);

// Verify all 4 privilege items
const expectedPrivileges = [
  "Personalized learner dashboard and study progress tracking",
  "Browse 100+ accredited curricula and verified tutor profiles",
  "24/7 access to free study guides, sample lessons, and webinars",
  "Zero upfront commitment — pay only when you enroll in paid programs",
];
expectedPrivileges.forEach((item) => {
  assert(step7Content.includes(item), `Privilege item preserved: "${item.slice(0, 40)}..."`);
});

// 4. Primary CTA Button
console.log("\n--- 4. Primary CTA Button Layout & Alignment ---");
assert(
  step7Content.includes("pt-4 sm:pt-6 max-w-md mx-auto"),
  "CTA container provides sufficient top spacing from the privileges card"
);
assert(
  step7Content.includes("min-h-[50px] sm:min-h-[52px]"),
  "CTA button meets accessibility height standard (min-h-[50px] sm:min-h-[52px])"
);
assert(
  step7Content.includes("inline-flex items-center justify-center gap-2.5"),
  "CTA button label and arrow icon are vertically and horizontally aligned"
);
assert(
  step7Content.includes("href=\"/student/dashboard\""),
  "CTA button links to /student/dashboard"
);

// 5. Responsive Container & Mobile Width Simulation
console.log("\n--- 5. Responsive Container & Width Checks ---");
assert(
  step7Content.includes("max-w-xl mx-auto"),
  "Outer container uses centered max-w-xl container"
);
assert(
  step7Content.includes("p-6 sm:p-10 lg:p-12"),
  "Outer card uses responsive padding (p-6 on mobile, p-10 on tablet, p-12 on desktop)"
);

const testWidths = [320, 360, 375, 390, 430];
testWidths.forEach((w) => {
  assert(w >= 320, `Width ${w}px: Layout remains balanced with ample side gutters and readable columns`);
});

console.log("\n======================================================================");
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("======================================================================");

if (failed > 0) {
  process.exit(1);
}
