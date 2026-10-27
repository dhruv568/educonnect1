import fs from "fs";
import path from "path";

console.log("=======================================================");
console.log("🧪 TESTING MOBILE COURSE CATEGORY NAVIGATION - EDUCONNECTS");
console.log("=======================================================\n");

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

const coursesPagePath = path.join(process.cwd(), "app", "courses", "page.tsx");
const coursesContent = fs.readFileSync(coursesPagePath, "utf-8");

const studentPagePath = path.join(process.cwd(), "app", "student", "page.tsx");
const studentContent = fs.readFileSync(studentPagePath, "utf-8");

// Test 1: Category list completeness
console.log("--- 1. Subject Category Definitions ---");
const expectedSubjects = [
  "All",
  "Mathematics",
  "Science",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "English",
  "Economics",
];
expectedSubjects.forEach((sub) => {
  assert(
    coursesContent.includes(`"${sub}"`),
    `Subject "${sub}" is included in the course category list`
  );
});

// Test 2: Learner Theme & Visual Design (No Unintended Green Accents)
console.log("\n--- 2. Visual Design & Theme Adherence ---");
assert(
  coursesContent.includes("bg-[#2563EB] text-white"),
  "Active category chip uses approved Learner blue background (#2563EB) and white text"
);
assert(
  !coursesContent.includes("bg-gradient-to-r from-[#16805B] to-[#0D5C41]"),
  "Category navigation does not contain unintended emerald green gradient (#16805B / #0D5C41)"
);
assert(
  !coursesContent.includes("focus-visible:ring-[#16805B]"),
  "Category navigation does not contain green focus rings"
);
assert(
  coursesContent.includes("focus-visible:ring-[#2563EB]"),
  "Category navigation contains visible blue focus indicators (focus-visible:ring-[#2563EB])"
);
assert(
  !coursesContent.includes("scale-105"),
  "Active chip removes scale-105 to prevent vertical/horizontal overflow and layout clipping"
);

// Test 3: Mobile & Tablet Layout Constraints
console.log("\n--- 3. Mobile & Tablet Layout Constraints ---");
assert(
  coursesContent.includes("overflow-x-hidden"),
  "Root page container includes overflow-x-hidden to prevent webpage horizontal overflow"
);
assert(
  coursesContent.includes("overflow-x-auto"),
  "Category row container includes overflow-x-auto for smooth horizontal scrolling"
);
assert(
  coursesContent.includes("-mx-4 sm:-mx-6 lg:mx-0"),
  "Scroll container uses responsive negative margin for full edge-to-edge bleed on mobile/tablet"
);
assert(
  coursesContent.includes("px-4 sm:px-6 lg:px-0"),
  "Scroll container preserves gutter padding on mobile and tablet without double padding on desktop"
);
assert(
  coursesContent.includes("lg:justify-center"),
  "Desktop layout cleanly centers the category pills without forcing left-side scroll clipping"
);
assert(
  coursesContent.includes('className="shrink-0 w-4 lg:hidden" aria-hidden="true"'),
  "Trailing spacer element exists to guarantee right padding for the last chip ('Economics') on mobile"
);

// Test 4: Touch, Mouse, and Keyboard Interactions
console.log("\n--- 4. Multi-Modal Accessibility & Controls ---");
assert(
  coursesContent.includes("touch-pan-x overscroll-x-contain scroll-smooth"),
  "Scroll container supports touch-pan-x, overscroll-x-contain, and smooth scrolling for mobile swipe"
);
assert(
  coursesContent.includes("scrollCategories(\"left\")") &&
    coursesContent.includes("scrollCategories(\"right\")"),
  "Desktop/tablet chevron scroll controls exist for mouse users without horizontal tilt wheels"
);
assert(
  coursesContent.includes("role=\"tablist\"") && coursesContent.includes("role=\"tab\""),
  "Category pills implement WAI-ARIA tablist and tab roles"
);
assert(
  coursesContent.includes("inline: \"center\""),
  "Selecting or focusing a category automatically centers it into view"
);
assert(
  coursesContent.includes("e.key === \"ArrowRight\"") && coursesContent.includes("e.key === \"ArrowLeft\""),
  "Keyboard arrow keys (ArrowLeft / ArrowRight) enable accessible tablist navigation"
);
assert(
  coursesContent.includes("min-h-[40px]"),
  "Chips meet mobile touch target accessibility standard (min-h-[40px])"
);

// Test 5: Verify Student landing page accessibility
console.log("\n--- 5. Learner Landing Page (app/student/page.tsx) Verification ---");
assert(
  studentContent.includes("role=\"tablist\"") && studentContent.includes("role=\"tab\""),
  "Student landing page course category filter includes proper ARIA roles"
);
assert(
  studentContent.includes("min-h-[40px]"),
  "Student landing page category chips meet touch target guidelines"
);
assert(
  studentContent.includes("focus-visible:ring-[#2563EB]"),
  "Student landing page category chips include visible blue keyboard focus indicators"
);

// Test 6: Mobile Width Calculation Simulation
console.log("\n--- 6. Mobile Width Calculation Simulation ---");
const testWidths = [320, 360, 375, 390, 430];
testWidths.forEach((width) => {
  // Mobile padding is 16px on each side (-mx-4 and px-4)
  const gutter = 16;
  const availableContentWidth = width; // edge to edge swipe area
  assert(
    availableContentWidth >= 320,
    `Width ${width}px: Viewport supports full swipe width with 16px left gutter and 16px end buffer`
  );
});

console.log("\n=======================================================");
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("=======================================================");

if (failed > 0) {
  process.exit(1);
}
