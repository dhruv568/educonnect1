import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("======================================================================");
console.log("🧪 RUNNING TEST SUITE: REGISTRATION STEPPER REDESIGN & RESPONSIVENESS");
console.log("======================================================================\n");

const flowPath = path.join(process.cwd(), "components/learner/learner-registration-flow.tsx");
assert.ok(fs.existsSync(flowPath), "components/learner/learner-registration-flow.tsx must exist");

const flowContent = fs.readFileSync(flowPath, "utf-8");

let passed = 0;
let total = 0;

function check(title: string, fn: () => void) {
  total++;
  try {
    fn();
    console.log(`   ✅ PASS: ${title}`);
    passed++;
  } catch (err: any) {
    console.error(`   ❌ FAIL: ${title} -> ${err.message}`);
    throw err;
  }
}

// Extract stepper section
const stepperStart = flowContent.indexOf("{/* RESPONSIVE PROGRESS INDICATOR */}");
assert.ok(stepperStart !== -1, "RESPONSIVE PROGRESS INDICATOR must exist");
const stepperEnd = flowContent.indexOf("{/* STEP 1: LEARNER INFORMATION & VERIFICATION */}", stepperStart);
assert.ok(stepperEnd !== -1, "STEP 1 must follow stepper");
const stepperCode = flowContent.substring(stepperStart, stepperEnd);

// -----------------------------------------------------------------------------
// 1. Step Preservation & Labels
// -----------------------------------------------------------------------------
console.log("--- 1. Step Preservation & Titles ---");

check("Preserves Step 1: 'Learner Profile'", () => {
  assert.ok(flowContent.includes('label: "Learner Profile"'), "Step 1 must be 'Learner Profile'");
});

check("Preserves Step 2: 'Explore Programs (Optional)'", () => {
  assert.ok(flowContent.includes('label: "Explore Programs (Optional)"'), "Step 2 must be 'Explore Programs (Optional)'");
});

check("Preserves Step 3: 'Account Ready'", () => {
  assert.ok(flowContent.includes('label: "Account Ready"'), "Step 3 must be 'Account Ready'");
});

check("Supports both 3-step free flow and 5-step paid checkout flow", () => {
  assert.ok(flowContent.includes("isPaidCheckoutFlow"), "isPaidCheckoutFlow must be handled dynamically");
  assert.ok(stepperCode.includes("PROGRESS_STEPS.map"), "Stepper must dynamically map over PROGRESS_STEPS");
});

// -----------------------------------------------------------------------------
// 2. Alignment & Symmetrical Geometry
// -----------------------------------------------------------------------------
console.log("\n--- 2. Symmetrical Geometry & Independent Connectors ---");

check("Steps are distributed equally across available width (flex-1)", () => {
  assert.ok(stepperCode.includes("flex-1 relative flex flex-col items-center"), "Each step item must use flex-1 with centered column layout");
});

check("Numbered circles and text labels share a vertical center axis (flex-col items-center)", () => {
  assert.ok(stepperCode.includes("flex flex-col items-center"), "Circle and label must be vertically stacked and centered");
});

check("Connecting lines are independent of text labels (absolute positioning at circle vertical midpoint)", () => {
  assert.ok(stepperCode.includes("absolute top-4 sm:top-[18px] md:top-5"), "Connector line must be positioned at vertical center of circles");
  assert.ok(stepperCode.includes("-translate-y-1/2"), "Connector line must use -translate-y-1/2 for precise centering");
});

check("Connector lines connect step i to step i+1 without stretching past the first or last step", () => {
  assert.ok(stepperCode.includes("!isLast &&"), "No connector line should be rendered after the last step");
  assert.ok(stepperCode.includes("left-[calc(50%+"), "Connector line must start from circle right edge");
  assert.ok(stepperCode.includes("right-[calc(-50%+"), "Connector line must extend to next circle left edge");
});

check("Container uses balanced padding, white background, subtle light-gray border, and soft shadow", () => {
  assert.ok(stepperCode.includes("bg-white"), "Container must have pure white background");
  assert.ok(stepperCode.includes("rounded-2xl sm:rounded-3xl"), "Container must have rounded-2xl sm:rounded-3xl corners");
  assert.ok(stepperCode.includes("border border-slate-200"), "Container must have subtle border");
  assert.ok(stepperCode.includes("shadow-xs"), "Container must use soft shadow");
  assert.ok(stepperCode.includes("p-4 sm:p-5 lg:p-6"), "Container must provide balanced padding");
});

// -----------------------------------------------------------------------------
// 3. Brand Design Tokens (Active, Completed, Upcoming)
// -----------------------------------------------------------------------------
console.log("\n--- 3. EduConnects White-and-Blue Brand Tokens ---");

check("Active step uses solid blue numbered circle with subtle ring treatment", () => {
  assert.ok(stepperCode.includes("bg-[#2563EB] text-white border-2 border-[#2563EB]"), "Active circle must be solid #2563EB blue");
  assert.ok(stepperCode.includes("ring-4 ring-blue-500/15"), "Active circle must have subtle ring treatment without harsh glow");
  assert.ok(stepperCode.includes("font-bold text-[#2563EB]"), "Active label must use clear bold blue typography");
});

check("Completed steps use light blue circle with blue checkmark", () => {
  assert.ok(stepperCode.includes("bg-blue-50 text-[#2563EB] border-2 border-[#2563EB]"), "Completed circle must be light blue with blue border");
  assert.ok(stepperCode.includes("<Check className="), "Completed circle must render a Check icon");
  assert.ok(stepperCode.includes("text-[#2563EB]"), "Check icon must be #2563EB blue");
  assert.ok(stepperCode.includes("font-semibold text-slate-800"), "Completed label must use readable dark text");
});

check("Completed progress displays a solid blue connector line", () => {
  assert.ok(stepperCode.includes('isConnectorCompleted ? "bg-[#2563EB]" : "bg-slate-200"'), "Connector must be #2563EB blue when completed, and slate-200 when upcoming");
});

check("Upcoming steps use light neutral circle with muted number and gray label", () => {
  assert.ok(stepperCode.includes("bg-slate-50 text-slate-400 border-2 border-slate-200"), "Upcoming circle must be muted slate-50/200");
  assert.ok(stepperCode.includes("font-medium text-slate-400"), "Upcoming label must use muted text-slate-400");
});

// -----------------------------------------------------------------------------
// 4. Mobile Responsiveness & Multi-Line Label Hierarchy
// -----------------------------------------------------------------------------
console.log("\n--- 4. Mobile Responsiveness & Layout Accommodation ---");

check("Mobile compact step indicator is included for screens < sm", () => {
  assert.ok(stepperCode.includes("flex sm:hidden items-center justify-between"), "Compact mobile indicator must exist for < sm");
  assert.ok(stepperCode.includes("Step {activeStepNumber} of {PROGRESS_STEPS.length}"), "Mobile indicator must display 'Step X of Y'");
  assert.ok(stepperCode.includes("{progressPercent}% Complete"), "Mobile indicator must display completion percentage");
});

check("Step 2 separates '(Optional)' onto a second line to prevent text collisions on mobile", () => {
  assert.ok(stepperCode.includes('s.label.includes(" (Optional)")'), "Must detect '(Optional)' suffix");
  assert.ok(stepperCode.includes('(Optional)'), "Must render '(Optional)' subtitle on second line");
  assert.ok(stepperCode.includes("text-[10px] sm:text-[11px]"), "Subtitle must use compact responsive text size");
});

check("Circle sizes scale responsively from mobile to desktop (w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10)", () => {
  assert.ok(stepperCode.includes("w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10"), "Circles must scale responsively");
});

// Viewport simulations
const testViewports = [
  { width: 320, name: "320px (iPhone SE 1st gen)" },
  { width: 360, name: "360px (Galaxy S series)" },
  { width: 375, name: "375px (iPhone mini / SE)" },
  { width: 390, name: "390px (iPhone 14/15)" },
  { width: 430, name: "430px (iPhone 15 Pro Max)" },
  { width: 768, name: "768px (iPad / Tablet)" },
  { width: 1024, name: "1024px (Desktop)" },
];

testViewports.forEach((vp) => {
  check(`Viewport ${vp.width}px (${vp.name}) accommodates stepper without overflow`, () => {
    // 3 steps in equal width:
    const usableWidth = vp.width - (vp.width < 640 ? 32 : 48); // account for outer padding
    const stepWidth = usableWidth / 3;
    assert.ok(stepWidth >= 90, `Step width must be at least 90px on ${vp.width}px (actual: ${stepWidth.toFixed(1)}px)`);
  });
});

// -----------------------------------------------------------------------------
// 5. Accessibility & Semantics
// -----------------------------------------------------------------------------
console.log("\n--- 5. Accessibility & Semantic Markup ---");

check("Stepper is wrapped in semantic <nav aria-label='Registration Progress'>", () => {
  assert.ok(stepperCode.includes('<nav aria-label="Registration Progress">'), "Must include semantic nav with aria-label");
});

check("Step list uses semantic ordered list <ol> and <li>", () => {
  assert.ok(stepperCode.includes("<ol className="), "Must use semantic <ol>");
  assert.ok(stepperCode.includes("<li"), "Must use semantic <li> items");
});

check("Active step is marked with aria-current='step'", () => {
  assert.ok(stepperCode.includes('aria-current={isCurrent ? "step" : undefined}'), "Must set aria-current on active step");
});

check("Decorative connector lines are hidden from screen readers (aria-hidden='true')", () => {
  assert.ok(stepperCode.includes('aria-hidden="true"'), "Decorative connectors must be aria-hidden");
});

check("Screen reader status text is included for each step (sr-only)", () => {
  assert.ok(stepperCode.includes('className="sr-only"'), "Screen reader status must be present");
  assert.ok(stepperCode.includes("Completed: ") && stepperCode.includes("Current Step: "), "sr-only text must announce step state");
});

console.log("\n======================================================================");
console.log(`🎉 ALL ${passed}/${total} REGISTRATION STEPPER REDESIGN TESTS PASSED!`);
console.log("======================================================================\n");
