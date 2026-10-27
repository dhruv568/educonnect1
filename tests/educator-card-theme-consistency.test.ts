import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("======================================================================");
console.log("🧪 RUNNING COMPREHENSIVE TEST SUITE: EDUCATOR CARD THEME CONSISTENCY");
console.log("======================================================================\n");

const educatorCardPath = path.join(process.cwd(), "components/educator/educator-card.tsx");
const discoveryCardGridPath = path.join(process.cwd(), "components/discovery/teacher-card-grid.tsx");
const discoveryEducatorCardPath = path.join(process.cwd(), "components/discovery/educator-card.tsx");
const studentPagePath = path.join(process.cwd(), "app/student/page.tsx");
const findTeachersPagePath = path.join(process.cwd(), "app/find-teachers/page.tsx");
const homePagePath = path.join(process.cwd(), "app/page.tsx");
const globalsCssPath = path.join(process.cwd(), "app/globals.css");
const tailwindConfigPath = path.join(process.cwd(), "tailwind.config.ts");
const glassButtonPath = path.join(process.cwd(), "components/glass/glass-button.tsx");
const glassBadgePath = path.join(process.cwd(), "components/glass/glass-badge.tsx");

assert.ok(fs.existsSync(educatorCardPath), "components/educator/educator-card.tsx must exist");
assert.ok(fs.existsSync(discoveryCardGridPath), "components/discovery/teacher-card-grid.tsx must exist");
assert.ok(fs.existsSync(discoveryEducatorCardPath), "components/discovery/educator-card.tsx must exist");
assert.ok(fs.existsSync(studentPagePath), "app/student/page.tsx must exist");
assert.ok(fs.existsSync(findTeachersPagePath), "app/find-teachers/page.tsx must exist");
assert.ok(fs.existsSync(homePagePath), "app/page.tsx must exist");
assert.ok(fs.existsSync(globalsCssPath), "app/globals.css must exist");
assert.ok(fs.existsSync(tailwindConfigPath), "tailwind.config.ts must exist");
assert.ok(fs.existsSync(glassButtonPath), "components/glass/glass-button.tsx must exist");
assert.ok(fs.existsSync(glassBadgePath), "components/glass/glass-badge.tsx must exist");

const educatorCardContent = fs.readFileSync(educatorCardPath, "utf-8");
const discoveryCardGridContent = fs.readFileSync(discoveryCardGridPath, "utf-8");
const discoveryEducatorCardContent = fs.readFileSync(discoveryEducatorCardPath, "utf-8");
const studentPageContent = fs.readFileSync(studentPagePath, "utf-8");
const findTeachersPageContent = fs.readFileSync(findTeachersPagePath, "utf-8");
const homePageContent = fs.readFileSync(homePagePath, "utf-8");
const globalsCssContent = fs.readFileSync(globalsCssPath, "utf-8");
const tailwindConfigContent = fs.readFileSync(tailwindConfigPath, "utf-8");
const glassButtonContent = fs.readFileSync(glassButtonPath, "utf-8");
const glassBadgeContent = fs.readFileSync(glassBadgePath, "utf-8");

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
// 1. Shared EducatorCard Component Reusability & Token Architecture
// -----------------------------------------------------------------------------
console.log("--- 1. Shared EducatorCard Component Architecture ---");

check("components/educator/educator-card.tsx exports EducatorCard component", () => {
  assert.ok(
    educatorCardContent.includes("export * from \"@/components/discovery/teacher-card-grid\"") ||
    educatorCardContent.includes("export function EducatorCard"),
    "Must export EducatorCard"
  );
});

check("components/discovery/teacher-card-grid.tsx defines and exports EducatorCard", () => {
  assert.ok(discoveryCardGridContent.includes("export function EducatorCard"), "Must export EducatorCard");
});

check("components/discovery/educator-card.tsx re-exports EducatorCard", () => {
  assert.ok(discoveryEducatorCardContent.includes("export * from"), "Must re-export EducatorCard");
});

check("Shared EducatorCard uses theme-aware button token instead of hardcoded hex colors", () => {
  assert.ok(discoveryCardGridContent.includes("bg-theme-primary"), "Must use bg-theme-primary token");
  assert.ok(discoveryCardGridContent.includes("hover:bg-theme-primary-dark"), "Must use hover:bg-theme-primary-dark");
  assert.ok(discoveryCardGridContent.includes("variant=\"theme\""), "Must use variant='theme'");
  assert.ok(!discoveryCardGridContent.includes("bg-[#16805B]"), "Shared component must not hardcode #16805B on button");
  assert.ok(!discoveryCardGridContent.includes("bg-[#2563EB]"), "Shared component must not hardcode #2563EB on button");
});

check("Shared EducatorCard text, borders, hover, and focus are theme-aware", () => {
  assert.ok(discoveryCardGridContent.includes("hover:border-theme-border"), "Card border hover must be theme-aware");
  assert.ok(discoveryCardGridContent.includes("group-hover:text-theme-primary"), "Educator name hover must be theme-aware");
  assert.ok(discoveryCardGridContent.includes("text-theme-primary truncate mt-0.5"), "Headline must use text-theme-primary");
  assert.ok(discoveryCardGridContent.includes("ring-theme-primary"), "Avatar ring must use ring-theme-primary");
  assert.ok(discoveryCardGridContent.includes("focus-visible:ring-theme-primary"), "Button focus ring must be theme-aware");
});

check("Shared EducatorCard uses dynamic card glow token", () => {
  assert.ok(discoveryCardGridContent.includes("var(--color-card-glow"), "Card must use var(--color-card-glow)");
});

// -----------------------------------------------------------------------------
// 2. Learner Portal (White-and-Blue Theme Verification)
// -----------------------------------------------------------------------------
console.log("\n--- 2. Learner Portal White-and-Blue Theme ---");

check("Learner landing page (app/student/page.tsx) renders shared EducatorCard", () => {
  assert.ok(studentPageContent.includes("<EducatorCard"), "Must render <EducatorCard");
  assert.ok(studentPageContent.includes("import { EducatorCard }"), "Must import EducatorCard");
});

check("Learner landing page root container has data-theme='learner'", () => {
  assert.ok(studentPageContent.includes("data-theme=\"learner\""), "Must have data-theme='learner'");
});

check("Learner theme defines blue color tokens in globals.css", () => {
  assert.ok(globalsCssContent.includes("[data-theme=\"learner\"]"), "Must have [data-theme='learner'] block");
  assert.ok(globalsCssContent.includes("--color-primary: #2563EB;"), "Learner primary must be #2563EB");
  assert.ok(globalsCssContent.includes("--color-primary-dark: #1E40AF;"), "Learner primary dark must be #1E40AF");
  assert.ok(globalsCssContent.includes("--color-primary-light: #60A5FA;"), "Learner primary light must be #60A5FA");
  assert.ok(globalsCssContent.includes("--color-primary-soft: #EFF6FF;"), "Learner primary soft must be #EFF6FF");
  assert.ok(globalsCssContent.includes("--color-border-brand: #BFDBFE;"), "Learner border brand must be #BFDBFE");
  assert.ok(globalsCssContent.includes("--color-card-glow: rgba(37, 99, 235, 0.15);"), "Learner card glow must be blue");
});

check("Tailwind config maps theme colors to active CSS variable tokens", () => {
  assert.ok(tailwindConfigContent.includes("primary: \"var(--color-primary)\""));
  assert.ok(tailwindConfigContent.includes("\"primary-dark\": \"var(--color-primary-dark)\""));
  assert.ok(tailwindConfigContent.includes("border: \"var(--color-border-brand)\""));
  assert.ok(tailwindConfigContent.includes("ring: \"var(--color-ring)\""));
});

// -----------------------------------------------------------------------------
// 3. Main EduConnects Website (Configured Brand Theme Verification)
// -----------------------------------------------------------------------------
console.log("\n--- 3. Main EduConnects Website Configured Brand Theme ---");

check("Main website homepage (app/page.tsx) sets data-theme='home'", () => {
  assert.ok(homePageContent.includes("data-theme=\"home\""), "Must have data-theme='home'");
});

check("Main website tutor discovery page (app/find-teachers/page.tsx) sets data-theme='main'", () => {
  assert.ok(findTeachersPageContent.includes("data-theme=\"main\""), "Must have data-theme='main'");
});

check("Main website tutor discovery page renders TeacherCardGrid with shared EducatorCards", () => {
  assert.ok(findTeachersPageContent.includes("<TeacherCardGrid"), "Must render TeacherCardGrid");
  assert.ok(discoveryCardGridContent.includes("<EducatorCard"), "TeacherCardGrid must render EducatorCard");
});

check("Main website brand theme defines emerald color tokens in globals.css", () => {
  assert.ok(globalsCssContent.includes("[data-theme=\"home\"],"), "Must have [data-theme='home'] block");
  assert.ok(globalsCssContent.includes("[data-theme=\"main\"]"), "Must have [data-theme='main'] block");
  assert.ok(globalsCssContent.includes("--color-primary: #16805B;"), "Main primary must be #16805B");
  assert.ok(globalsCssContent.includes("--color-primary-dark: #0D5C41;"), "Main primary dark must be #0D5C41");
  assert.ok(globalsCssContent.includes("--color-border-brand: #A7F3D0;"), "Main border brand must be #A7F3D0");
  assert.ok(globalsCssContent.includes("--color-card-glow: rgba(22, 128, 91, 0.15);"), "Main card glow must be emerald");
});

// -----------------------------------------------------------------------------
// 4. Semantic Status Indicators Preservation
// -----------------------------------------------------------------------------
console.log("\n--- 4. Semantic Status Indicators Preservation ---");

check("Verification badge preserves semantic emerald status badge with ShieldCheck", () => {
  assert.ok(discoveryCardGridContent.includes("variant=\"emerald\""), "Verification badge must remain variant='emerald'");
  assert.ok(discoveryCardGridContent.includes("ShieldCheck"), "Must include ShieldCheck icon");
  assert.ok(discoveryCardGridContent.includes("Verified"), "Must include Verified label");
});

check("Star rating preserves semantic amber gold indicator", () => {
  assert.ok(discoveryCardGridContent.includes("text-amber-500"), "Rating must use text-amber-500");
  assert.ok(discoveryCardGridContent.includes("★"), "Must include star symbol");
});

// -----------------------------------------------------------------------------
// 5. Overflow Prevention & Responsiveness Constraints
// -----------------------------------------------------------------------------
console.log("\n--- 5. Overflow Prevention & Responsiveness Constraints ---");

check("EducatorCard preserves container overflow-hidden constraint", () => {
  assert.ok(discoveryCardGridContent.includes("overflow-hidden"), "Must include overflow-hidden");
});

check("EducatorCard preserves text container min-w-0 flex-1 constraint", () => {
  assert.ok(discoveryCardGridContent.includes("min-w-0 flex-1"), "Must include min-w-0 flex-1");
});

check("EducatorCard preserves name truncate min-w-0 constraint with title attribute", () => {
  assert.ok(discoveryCardGridContent.includes("truncate min-w-0"), "Name must include truncate min-w-0");
  assert.ok(discoveryCardGridContent.includes("title={name}"), "Name must have title attribute for tooltip");
});

check("EducatorCard preserves headline truncate mt-0.5 constraint with title attribute", () => {
  assert.ok(discoveryCardGridContent.includes("truncate mt-0.5"), "Headline must include truncate mt-0.5");
  assert.ok(discoveryCardGridContent.includes("title={headline}"), "Headline must have title attribute for tooltip");
});

check("EducatorCard verification badge includes shrink-0 to prevent compression", () => {
  assert.ok(discoveryCardGridContent.includes("ShieldCheck className=\"h-3 w-3 shrink-0\""), "ShieldCheck must have shrink-0");
});

// -----------------------------------------------------------------------------
// 6. Interactive Button States & Booking Preservation
// -----------------------------------------------------------------------------
console.log("\n--- 6. Interactive States & Booking Route Preservation ---");

check("GlassButton theme variant supports default, hover, active, focus, and disabled states", () => {
  assert.ok(glassButtonContent.includes("theme:"), "GlassButton must have theme variant");
  const themeLine = glassButtonContent.substring(
    glassButtonContent.indexOf("theme:"),
    glassButtonContent.indexOf("};\n\n    const sizes")
  );
  assert.ok(themeLine.includes("bg-[var(--color-primary)]"), "Must have default theme bg");
  assert.ok(themeLine.includes("hover:bg-[var(--color-primary-dark)]"), "Must have hover dark state");
  assert.ok(themeLine.includes("active:opacity-95"), "Must have active state");
  assert.ok(themeLine.includes("focus-visible:ring-[var(--color-primary)]"), "Must have theme focus ring");
  assert.ok(themeLine.includes("disabled:bg-slate-300"), "Must have disabled state");
});

check("GlassBadge theme variant supports soft background and brand border", () => {
  assert.ok(glassBadgeContent.includes("theme:"), "GlassBadge must have theme variant");
  assert.ok(glassBadgeContent.includes("bg-[var(--color-primary-soft)]"), "Must use color-primary-soft");
});

check("Booking URL target preserves educatorId and trial=true parameters", () => {
  assert.ok(
    discoveryCardGridContent.includes("/student/register?educatorId=${educator.id}&trial=true"),
    "Must preserve /student/register?educatorId=${educator.id}&trial=true"
  );
});

console.log("\n======================================================================");
console.log(`🎉 ALL ${passed}/${total} EDUCATOR CARD THEME CONSISTENCY TESTS PASSED!`);
console.log("======================================================================\n");
