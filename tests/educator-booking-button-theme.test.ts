import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("======================================================================");
console.log("🧪 RUNNING TEST SUITE: EDUCATOR & LEARNER BOOKING BUTTON BLUE THEME");
console.log("======================================================================\n");

const cardGridPath = path.join(process.cwd(), "components/discovery/teacher-card-grid.tsx");
const previewModalPath = path.join(process.cwd(), "components/discovery/teacher-preview-modal.tsx");
const studentPagePath = path.join(process.cwd(), "app/student/page.tsx");
const teacherDetailPath = path.join(process.cwd(), "app/find-teachers/[id]/page.tsx");
const glassButtonPath = path.join(process.cwd(), "components/glass/glass-button.tsx");
const globalsCssPath = path.join(process.cwd(), "app/globals.css");

assert.ok(fs.existsSync(cardGridPath), "components/discovery/teacher-card-grid.tsx must exist");
assert.ok(fs.existsSync(previewModalPath), "components/discovery/teacher-preview-modal.tsx must exist");
assert.ok(fs.existsSync(studentPagePath), "app/student/page.tsx must exist");
assert.ok(fs.existsSync(teacherDetailPath), "app/find-teachers/[id]/page.tsx must exist");
assert.ok(fs.existsSync(glassButtonPath), "components/glass/glass-button.tsx must exist");
assert.ok(fs.existsSync(globalsCssPath), "app/globals.css must exist");

const cardGridContent = fs.readFileSync(cardGridPath, "utf-8");
const previewModalContent = fs.readFileSync(previewModalPath, "utf-8");
const studentPageContent = fs.readFileSync(studentPagePath, "utf-8");
const teacherDetailContent = fs.readFileSync(teacherDetailPath, "utf-8");
const glassButtonContent = fs.readFileSync(glassButtonPath, "utf-8");
const globalsCssContent = fs.readFileSync(globalsCssPath, "utf-8");

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

// Helper to extract the GlassButton tag around "Book Trial Lesson"
function extractButtonBlock(content: string, label: string) {
  const labelIdx = content.indexOf(label);
  assert.ok(labelIdx !== -1, `Label '${label}' must exist in content`);
  const parentStart = content.lastIndexOf("<GlassButton", labelIdx) !== -1
    ? content.lastIndexOf("<GlassButton", labelIdx)
    : content.lastIndexOf("<button", labelIdx);
  const tagEnd = content.indexOf("</GlassButton>", labelIdx) !== -1
    ? content.indexOf("</GlassButton>", labelIdx) + "</GlassButton>".length
    : content.indexOf("</button>", labelIdx) + "</button>".length;
  return content.substring(parentStart, tagEnd);
}

// -----------------------------------------------------------------------------
// 1. TeacherCardGrid / EducatorCard Button Theme
// -----------------------------------------------------------------------------
console.log("--- 1. TeacherCardGrid Button Theme ---");

const cardGridBtn = extractButtonBlock(cardGridContent, "Book Trial Lesson");

check("TeacherCardGrid uses variant='theme' for dynamic brand and portal alignment", () => {
  assert.ok(cardGridBtn.includes('variant="theme"'), "Must use variant='theme'");
});

check("TeacherCardGrid uses bg-theme-primary design token rather than hardcoded colors", () => {
  assert.ok(cardGridBtn.includes("bg-theme-primary"), "Must include bg-theme-primary");
});

check("TeacherCardGrid has hover state hover:bg-theme-primary-dark", () => {
  assert.ok(cardGridBtn.includes("hover:bg-theme-primary-dark"), "Must include hover:bg-theme-primary-dark");
});

check("TeacherCardGrid text and arrow icon are white (#FFFFFF)", () => {
  assert.ok(cardGridBtn.includes("text-white"), "Button must have text-white");
  assert.ok(cardGridBtn.includes("ArrowRight") && cardGridBtn.includes("text-white"), "Arrow icon must have text-white");
});

check("TeacherCardGrid has theme-aware focus ring", () => {
  assert.ok(
    cardGridBtn.includes("focus-visible:ring-theme-primary"),
    "Must include accessible theme focus ring"
  );
});

check("TeacherCardGrid has muted neutral disabled state", () => {
  assert.ok(
    cardGridBtn.includes("disabled:bg-slate-300") && cardGridBtn.includes("disabled:text-slate-500"),
    "Must include neutral disabled styling"
  );
});

check("TeacherCardGrid removes hardcoded green/blue classes from shared component", () => {
  assert.ok(!cardGridBtn.includes("bg-[#16805B]"), "Must not include hardcoded bg-[#16805B]");
  assert.ok(!cardGridBtn.includes("bg-[#2563EB]"), "Must not include hardcoded bg-[#2563EB]");
  assert.ok(!cardGridBtn.includes("hover:bg-[#0D5C41]"), "Must not include hover:bg-[#0D5C41]");
  assert.ok(!cardGridBtn.includes("shadow-emerald-700"), "Must not include shadow-emerald-700");
  assert.ok(!cardGridBtn.includes('variant="primary"'), "Must not use variant='primary'");
});

check("TeacherCardGrid preserves educator verification badge (emerald status)", () => {
  assert.ok(
    cardGridContent.includes('variant="emerald"') && cardGridContent.includes("ShieldCheck"),
    "Educator verification badge must remain emerald"
  );
});

check("TeacherCardGrid preserves booking link target with educatorId and trial=true", () => {
  assert.ok(
    cardGridContent.includes("targetBookingUrl") || cardGridContent.includes("trial=true"),
    "Booking URL with educatorId and trial=true must be preserved"
  );
});

// -----------------------------------------------------------------------------
// 2. TeacherPreviewModal "Book Trial Lesson" Button
// -----------------------------------------------------------------------------
console.log("\n--- 2. TeacherPreviewModal Button Theme ---");

const previewModalBtn = extractButtonBlock(previewModalContent, "Book Trial Lesson");

check("TeacherPreviewModal uses variant='learner' on Book Trial Lesson button", () => {
  assert.ok(previewModalBtn.includes('variant="learner"'), "Must use variant='learner'");
});

check("TeacherPreviewModal has default background #2563EB", () => {
  assert.ok(previewModalBtn.includes("bg-[#2563EB]"), "Must include bg-[#2563EB]");
});

check("TeacherPreviewModal has hover background #1D4ED8", () => {
  assert.ok(previewModalBtn.includes("hover:bg-[#1D4ED8]"), "Must include hover:bg-[#1D4ED8]");
});

check("TeacherPreviewModal text and arrow icon are white (#FFFFFF)", () => {
  assert.ok(previewModalBtn.includes("text-white"), "Button must have text-white");
  assert.ok(previewModalBtn.includes("ArrowRight") && previewModalBtn.includes("text-white"), "Arrow icon must have text-white");
});

check("TeacherPreviewModal has visible blue focus ring", () => {
  assert.ok(
    previewModalBtn.includes("focus-visible:ring-[#2563EB]"),
    "Must include accessible blue focus ring"
  );
});

check("TeacherPreviewModal has neutral disabled state", () => {
  assert.ok(
    previewModalBtn.includes("disabled:bg-slate-300"),
    "Must include neutral disabled styling"
  );
});

check("TeacherPreviewModal removes unintended green classes on Book Trial Lesson button", () => {
  assert.ok(!previewModalBtn.includes("bg-[#16805B]"), "Must not include bg-[#16805B]");
  assert.ok(!previewModalBtn.includes("hover:bg-[#0D5C41]"), "Must not include hover:bg-[#0D5C41]");
  assert.ok(!previewModalBtn.includes("shadow-emerald-700"), "Must not include shadow-emerald-700");
  assert.ok(!previewModalBtn.includes('variant="primary"'), "Must not use variant='primary'");
});

check("TeacherPreviewModal preserves booking link target with educatorId and trial=true", () => {
  assert.ok(
    previewModalContent.includes("href={`/student/register?educatorId=${teacher.id}&trial=true`}"),
    "Modal booking URL with educatorId and trial=true must be preserved"
  );
});

// -----------------------------------------------------------------------------
// 3. Learner Landing Page (app/student/page.tsx) Educator Cards
// -----------------------------------------------------------------------------
console.log("\n--- 3. Learner Page (app/student/page.tsx) Educator Cards ---");

check("Learner page renders shared EducatorCard component", () => {
  assert.ok(
    studentPageContent.includes("<EducatorCard") && studentPageContent.includes('import { EducatorCard }'),
    "Learner landing page must render shared EducatorCard"
  );
});

check("Learner page defines data-theme='learner' for white-and-blue theme tokens", () => {
  assert.ok(
    studentPageContent.includes('data-theme="learner"'),
    "Learner landing page must set data-theme='learner'"
  );
});

check("Design system defines #2563EB and #1E40AF under [data-theme='learner']", () => {
  assert.ok(globalsCssContent.includes('[data-theme="learner"]') && globalsCssContent.includes("--color-primary: #2563EB;"));
  assert.ok(globalsCssContent.includes("--color-primary-dark: #1E40AF;"));
});

// -----------------------------------------------------------------------------
// 4. Public Educator Detail Page (app/find-teachers/[id]/page.tsx)
// -----------------------------------------------------------------------------
console.log("\n--- 4. Public Educator Detail Page Button Theme ---");

const teacherDetailBtn = extractButtonBlock(teacherDetailContent, "Book Session");

check("Detail page Book Session button uses variant='learner'", () => {
  assert.ok(teacherDetailBtn.includes('variant="learner"'), "Must use variant='learner'");
});

check("Detail page Book Session button uses bg-[#2563EB] and hover:bg-[#1D4ED8]", () => {
  assert.ok(teacherDetailBtn.includes("bg-[#2563EB]"), "Must include bg-[#2563EB]");
  assert.ok(teacherDetailBtn.includes("hover:bg-[#1D4ED8]"), "Must include hover:bg-[#1D4ED8]");
});

check("Detail page Book Session button removes green classes", () => {
  assert.ok(!teacherDetailBtn.includes("bg-[#16805B]"), "Must not include bg-[#16805B]");
  assert.ok(!teacherDetailBtn.includes("hover:bg-[#0D5C41]"), "Must not include hover:bg-[#0D5C41]");
  assert.ok(!teacherDetailBtn.includes("shadow-emerald-700"), "Must not include shadow-emerald-700");
});

// -----------------------------------------------------------------------------
// 5. GlassButton Component Shared Variants
// -----------------------------------------------------------------------------
console.log("\n--- 5. GlassButton Component Theme Alignment ---");

check("GlassButton learner variant includes bg-[#2563EB]", () => {
  assert.ok(glassButtonContent.includes("learner:"), "Must have learner variant");
  const learnerLine = glassButtonContent.substring(
    glassButtonContent.indexOf("learner:"),
    glassButtonContent.indexOf("student:")
  );
  assert.ok(learnerLine.includes("bg-[#2563EB]"), "Learner variant must have bg-[#2563EB]");
  assert.ok(learnerLine.includes("hover:bg-[#1D4ED8]"), "Learner variant must have hover:bg-[#1D4ED8]");
  assert.ok(learnerLine.includes("focus-visible:ring-[#2563EB]"), "Learner variant must have focus-visible:ring-[#2563EB]");
});

check("GlassButton student variant includes bg-[#2563EB] and hover:bg-[#1D4ED8]", () => {
  assert.ok(glassButtonContent.includes("student:"), "Must have student variant");
  const studentLine = glassButtonContent.substring(
    glassButtonContent.indexOf("student:")
  );
  assert.ok(studentLine.includes("bg-[#2563EB]"), "Student variant must have bg-[#2563EB]");
  assert.ok(studentLine.includes("hover:bg-[#1D4ED8]"), "Student variant must have hover:bg-[#1D4ED8]");
  assert.ok(studentLine.includes("focus-visible:ring-[#2563EB]"), "Student variant must have focus-visible:ring-[#2563EB]");
});

check("GlassButton theme variant includes dynamic [var(--color-primary)]", () => {
  assert.ok(glassButtonContent.includes("theme:"), "Must have theme variant");
  assert.ok(glassButtonContent.includes("bg-[var(--color-primary)]"), "Theme variant must use var(--color-primary)");
});

console.log("\n======================================================================");
console.log(`🎉 ALL ${passed}/${total} EDUCATOR & LEARNER BOOKING BUTTON THEME TESTS PASSED!`);
console.log("======================================================================\n");
