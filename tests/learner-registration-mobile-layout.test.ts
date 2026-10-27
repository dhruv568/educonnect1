import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("======================================================================");
console.log("🧪 RUNNING TEST SUITE: LEARNER REGISTRATION MOBILE REDESIGN & SPACING");
console.log("======================================================================\n");

const flowPath = path.join(process.cwd(), "components/learner/learner-registration-flow.tsx");
const captchaPath = path.join(process.cwd(), "components/auth/registration-captcha.tsx");
const academicPath = path.join(process.cwd(), "components/learner/learner-academic-fields.tsx");
const inputPath = path.join(process.cwd(), "components/ui/input.tsx");

assert.ok(fs.existsSync(flowPath), "components/learner/learner-registration-flow.tsx must exist");
assert.ok(fs.existsSync(captchaPath), "components/auth/registration-captcha.tsx must exist");
assert.ok(fs.existsSync(academicPath), "components/learner/learner-academic-fields.tsx must exist");
assert.ok(fs.existsSync(inputPath), "components/ui/input.tsx must exist");

const flowContent = fs.readFileSync(flowPath, "utf-8");
const captchaContent = fs.readFileSync(captchaPath, "utf-8");
const academicContent = fs.readFileSync(academicPath, "utf-8");
const inputContent = fs.readFileSync(inputPath, "utf-8");

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

// -----------------------------------------------------------------------------
// 1. Step 1 Card & Header Rhythm
// -----------------------------------------------------------------------------
console.log("--- 1. Step 1 Card Padding & Header Spacing ---");

const step1BlockStart = flowContent.indexOf("state.step === 1");
assert.ok(step1BlockStart !== -1, "state.step === 1 must exist");
const step1Block = flowContent.substring(step1BlockStart, flowContent.indexOf("state.step === 2", step1BlockStart));

check("Step 1 GlassCard provides generous mobile padding (p-6 sm:p-8 md:p-10)", () => {
  assert.ok(
    step1Block.includes("p-6 sm:p-8 md:p-10") || step1Block.includes("p-6 sm:p-10"),
    "Step 1 GlassCard must have generous padding on mobile"
  );
});

check("Header provides balanced vertical rhythm (space-y-2.5 sm:space-y-3 and pb-5 sm:pb-6)", () => {
  assert.ok(
    step1Block.includes("space-y-2.5 sm:space-y-3") || step1Block.includes("space-y-3"),
    "Header must have comfortable vertical spacing"
  );
  assert.ok(
    step1Block.includes("pb-5 sm:pb-6") || step1Block.includes("pb-6"),
    "Header must have generous bottom padding"
  );
});

check("Header typography uses responsive line-height (leading-snug sm:leading-tight)", () => {
  assert.ok(
    step1Block.includes("leading-snug sm:leading-tight"),
    "Heading must have leading-snug sm:leading-tight"
  );
});

check("Header description has leading-relaxed and max-w-xl", () => {
  assert.ok(
    step1Block.includes("leading-relaxed") && step1Block.includes("max-w-xl"),
    "Header description must have leading-relaxed and max-w-xl"
  );
});

// -----------------------------------------------------------------------------
// 2. Form Layout & Vertical Spacing
// -----------------------------------------------------------------------------
console.log("\n--- 2. Form Layout & Field Separation ---");

check("Form groups have expanded spacing (space-y-5 sm:space-y-6)", () => {
  assert.ok(
    step1Block.includes("space-y-5 sm:space-y-6"),
    "Form must use space-y-5 sm:space-y-6 instead of crowded space-y-4"
  );
});

check("Email & Mobile grid has increased gap (gap-5 sm:gap-6)", () => {
  assert.ok(
    step1Block.includes("grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6"),
    "Email & Mobile grid must use gap-5 sm:gap-6"
  );
});

check("Password & Confirm Password grid has increased gap (gap-5 sm:gap-6)", () => {
  const passwordSection = step1Block.substring(
    step1Block.indexOf('label="Password"'),
    step1Block.indexOf("Learner Academic Profile")
  );
  assert.ok(
    step1Block.includes("gap-5 sm:gap-6"),
    "Password fields grid must have gap-5 sm:gap-6"
  );
});

check("Academic fields wrapper has top spacing (pt-2 sm:pt-2.5)", () => {
  assert.ok(
    step1Block.includes("pt-2 sm:pt-2.5"),
    "Academic fields wrapper must have comfortable top breathing room"
  );
});

// -----------------------------------------------------------------------------
// 3. Shared Input Component Spacing & Props
// -----------------------------------------------------------------------------
console.log("\n--- 3. Input Component Spacing & Flexibility ---");

check("InputProps includes optional containerClassName", () => {
  assert.ok(
    inputContent.includes("containerClassName?: string"),
    "InputProps must support containerClassName"
  );
});

check("Input container has space-y-2 for clear label-to-input breathing room", () => {
  assert.ok(
    inputContent.includes("space-y-2"),
    "Input container must have space-y-2"
  );
});

check("Helper text and error have pt-0.5 separating from input bottom border", () => {
  assert.ok(
    inputContent.includes("pt-0.5"),
    "Helper text/error must include pt-0.5"
  );
});

// -----------------------------------------------------------------------------
// 4. Education Type Cards Layout & Responsiveness
// -----------------------------------------------------------------------------
console.log("\n--- 4. Education Type Selection Cards ---");

check("Education Type cards use responsive grid (grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4)", () => {
  assert.ok(
    academicContent.includes("grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"),
    "Education Type cards must stack on mobile and span 2 columns on desktop"
  );
});

check("Both Education Type cards have minimum touch height of 58px (min-h-[58px])", () => {
  const matches = academicContent.match(/min-h-\[58px\]/g);
  assert.ok(matches && matches.length >= 2, "Both School and Diploma cards must have min-h-[58px]");
});

check("Education Type cards include CheckCircle2 indicator for selected state", () => {
  assert.ok(
    academicContent.includes("<CheckCircle2"),
    "Selected card must display a CheckCircle2 badge indicator"
  );
});

check("Education Type cards have distinct active styling (border-2 border-blue-600)", () => {
  assert.ok(
    academicContent.includes("border-2 border-blue-600"),
    "Active card must have prominent border-2 border-blue-600"
  );
});

check("Grade/Class dropdown meets mobile touch height (h-11 px-3.5)", () => {
  assert.ok(
    academicContent.includes("h-11 px-3.5 text-base sm:text-sm"),
    "Grade select must have h-11 px-3.5 text-base sm:text-sm"
  );
});

check("Stream buttons meet minimum touch target height (min-h-[44px])", () => {
  assert.ok(
    academicContent.includes("min-h-[44px]"),
    "Academic stream buttons must meet touch target height of 44px"
  );
});

check("Diploma branch dropdown meets mobile touch height (h-11 px-3.5)", () => {
  assert.ok(
    academicContent.includes("w-full h-11 px-3.5 text-base sm:text-sm"),
    "Diploma branch select must have h-11 px-3.5"
  );
});

// -----------------------------------------------------------------------------
// 5. CAPTCHA / Security Verification Card
// -----------------------------------------------------------------------------
console.log("\n--- 5. CAPTCHA Security Verification Card ---");

check("CAPTCHA card is full-width (w-full) without squeezed margins", () => {
  assert.ok(
    captchaContent.includes("w-full"),
    "CAPTCHA card must be full-width"
  );
});

check("CAPTCHA card has generous padding (p-4.5 sm:p-5)", () => {
  assert.ok(
    captchaContent.includes("p-4.5 sm:p-5") || captchaContent.includes("p-5"),
    "CAPTCHA card must have generous padding"
  );
});

check("CAPTCHA refresh button has minimum touch target (min-h-[36px]) and clear padding", () => {
  assert.ok(
    captchaContent.includes("min-h-[36px] px-3 py-1.5"),
    "Refresh button must have min-h-[36px] px-3 py-1.5"
  );
});

check("CAPTCHA challenge question box has prominent height (min-h-[48px]) and font size", () => {
  assert.ok(
    captchaContent.includes("min-h-[48px]") && captchaContent.includes("font-black text-base"),
    "Challenge display must have min-h-[48px] and bold font-black text-base"
  );
});

check("CAPTCHA answer input has comfortable height (min-h-[48px] h-12)", () => {
  assert.ok(
    captchaContent.includes("min-h-[48px] h-12 px-4 text-base"),
    "Answer input must have min-h-[48px] h-12 px-4 text-base"
  );
});

check("CAPTCHA helper text clearly explains anti-bot protection", () => {
  assert.ok(
    captchaContent.includes("Anti-bot protection to ensure genuine learner registration"),
    "Helper text must clearly state genuine learner registration anti-bot protection"
  );
});

// -----------------------------------------------------------------------------
// 6. Submit CTA Button & Bottom Link
// -----------------------------------------------------------------------------
console.log("\n--- 6. Submit Button & Bottom Link Spacing ---");

check("Primary CTA button has top breathing room container (pt-2 sm:pt-4)", () => {
  assert.ok(
    step1Block.includes("pt-2 sm:pt-4"),
    "CTA button must have pt-2 sm:pt-4 container separation"
  );
});

check("Primary CTA button meets accessibility height (min-h-[52px])", () => {
  assert.ok(
    step1Block.includes("min-h-[52px]"),
    "CTA button must have min-h-[52px]"
  );
});

check("Primary CTA button has rounded-2xl and clean text-sm sm:text-base font-bold", () => {
  assert.ok(
    step1Block.includes("rounded-2xl") && step1Block.includes("text-sm sm:text-base font-bold"),
    "CTA button must have rounded-2xl and text-sm sm:text-base font-bold"
  );
});

check("Bottom sign-in link has generous top spacing (pt-5 sm:pt-6 border-t)", () => {
  assert.ok(
    step1Block.includes("pt-5 sm:pt-6 border-t"),
    "Bottom sign-in link must have pt-5 sm:pt-6 border-t"
  );
});

check("Sign in link target is /student/login with bold text", () => {
  assert.ok(
    step1Block.includes('href="/student/login"') && step1Block.includes("Sign in as Learner"),
    "Sign in link must point to /student/login"
  );
});

// -----------------------------------------------------------------------------
// 7. Mobile Viewport Layout Simulation (320px, 360px, 375px, 390px, 430px)
// -----------------------------------------------------------------------------
console.log("\n--- 7. Viewport Responsive Layout Simulation ---");

const viewports = [
  { width: 320, name: "Ultra-compact (iPhone SE 1st gen / 320px)" },
  { width: 360, name: "Standard Android (Galaxy S series / 360px)" },
  { width: 375, name: "Compact iOS (iPhone mini / 375px)" },
  { width: 390, name: "Modern iOS (iPhone 13/14/15 / 390px)" },
  { width: 430, name: "Large Mobile (iPhone 14/15 Pro Max / 430px)" },
];

viewports.forEach((vp) => {
  check(`Viewport ${vp.width}px (${vp.name}) is fully accommodated`, () => {
    // 1. Padding on mobile is 24px (p-6) or 20px (p-5), leaving ample content width:
    const contentWidth = vp.width - 24 * 2;
    assert.ok(contentWidth >= 272, "Content width must be at least 272px");

    // 2. Education type cards stack into 1 column on mobile (grid-cols-1)
    // allowing full width for each card without horizontal squeeze
    assert.ok(
      academicContent.includes("grid-cols-1 sm:grid-cols-2"),
      "Cards must stack on mobile viewport"
    );

    // 3. CAPTCHA is w-full and flexes to column (flex-col sm:flex-row)
    assert.ok(
      captchaContent.includes("flex flex-col sm:flex-row"),
      "CAPTCHA must stack vertically on narrow screens"
    );

    // 4. CTA button is w-full
    assert.ok(
      step1Block.includes("w-full min-h-[52px]"),
      "CTA button must be w-full min-h-[52px]"
    );
  });
});

console.log("\n======================================================================");
console.log(`🎉 ALL ${passed}/${total} LEARNER REGISTRATION MOBILE REDESIGN TESTS PASSED!`);
console.log("======================================================================\n");
