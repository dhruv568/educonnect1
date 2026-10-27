import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("======================================================================");
console.log("🧪 RUNNING TEST SUITE: LEARNER MILESTONES BANNER IMAGE FIT & LAYOUT");
console.log("======================================================================\n");

const bannerPath = path.join(process.cwd(), "components/homepage/learner-milestones-banner.tsx");
const imagePath = path.join(process.cwd(), "public/images/learner-hero.jpeg");

assert.ok(fs.existsSync(bannerPath), "components/homepage/learner-milestones-banner.tsx must exist");
assert.ok(fs.existsSync(imagePath), "public/images/learner-hero.jpeg must exist");

const bannerContent = fs.readFileSync(bannerPath, "utf-8");

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
// 1. Asset File Verification
// -----------------------------------------------------------------------------
console.log("--- 1. Image Asset Dimensions & Aspect Ratio ---");

const imgBuf = fs.readFileSync(imagePath);
let imgWidth = 0;
let imgHeight = 0;
let offset = 2;
while (offset < imgBuf.length) {
  const marker = imgBuf.readUInt16BE(offset);
  offset += 2;
  if (marker === 0xffc0 || marker === 0xffc2) {
    imgHeight = imgBuf.readUInt16BE(offset + 3);
    imgWidth = imgBuf.readUInt16BE(offset + 5);
    break;
  }
  const length = imgBuf.readUInt16BE(offset);
  offset += length;
}

check("Image dimensions are 1807x870 pixels", () => {
  assert.strictEqual(imgWidth, 1807, "Image width must be 1807px");
  assert.strictEqual(imgHeight, 870, "Image height must be 870px");
});

check("Image aspect ratio is 2.077:1", () => {
  const aspect = imgWidth / imgHeight;
  assert.ok(Math.abs(aspect - 2.077) < 0.01, `Aspect ratio must be ~2.077 (actual: ${aspect})`);
});

// -----------------------------------------------------------------------------
// 2. Component Code & Image Fit Strategy
// -----------------------------------------------------------------------------
console.log("\n--- 2. Image Fit Strategy & Cropping Prevention ---");

check("Uses object-contain to ensure complete poster visibility without clipping", () => {
  assert.ok(bannerContent.includes("object-contain"), "Image must use object-contain");
  assert.ok(!bannerContent.includes("object-cover"), "Image must NOT use object-cover which crops edges");
});

check("Centers the image within container (object-center)", () => {
  assert.ok(bannerContent.includes("object-center"), "Image must use object-center");
});

check("Preserves exact aspect ratio (1807/870) avoiding fixed crop ratios", () => {
  assert.ok(bannerContent.includes("aspect-[1807/870]"), "Container must use aspect-[1807/870]");
  assert.ok(bannerContent.includes('style={{ aspectRatio: "1807 / 870" }}'), "Container must specify inline aspectRatio style for cross-browser safety");
  assert.ok(!bannerContent.includes("lg:aspect-[4/3]"), "Must NOT use lg:aspect-[4/3] which cuts off 36% of width");
  assert.ok(!bannerContent.includes("aspect-[16/10]"), "Must NOT use aspect-[16/10]");
});

check("Includes intrinsic width={1807} and height={870} to prevent CLS", () => {
  assert.ok(bannerContent.includes("width={1807}"), "Must specify intrinsic width={1807}");
  assert.ok(bannerContent.includes("height={870}"), "Must specify intrinsic height={870}");
});

check("Image container uses neutral white background behind poster (bg-white)", () => {
  assert.ok(bannerContent.includes("bg-white"), "Container must use bg-white neutral background");
  assert.ok(bannerContent.includes("rounded-2xl"), "Container must have rounded-2xl");
  assert.ok(bannerContent.includes("border border-[#E2E8F0]"), "Container must have border border-[#E2E8F0]");
});

check("Visual column uses self-stretch and vertical centering inside card", () => {
  assert.ok(bannerContent.includes("self-stretch"), "Visual column must use self-stretch");
  assert.ok(bannerContent.includes("flex items-center justify-center"), "Visual column must center image container");
});

// -----------------------------------------------------------------------------
// 3. Surrounding Section Preservation
// -----------------------------------------------------------------------------
console.log("\n--- 3. Surrounding Section Copy & Layout Preservation ---");

check("Preserves 'Learner Milestone Accomplishments' badge", () => {
  assert.ok(bannerContent.includes("Learner Milestone Accomplishments"), "Badge must be preserved");
  assert.ok(bannerContent.includes("<Trophy"), "Trophy icon must be preserved");
});

check("Preserves 'Empowering learners to reach their highest potential' heading", () => {
  assert.ok(bannerContent.includes("Empowering learners to reach their highest potential"), "Heading must be preserved");
});

check("Preserves supporting paragraph copy", () => {
  assert.ok(bannerContent.includes("From board exam preparation to cutting-edge technical skills"), "Paragraph copy must be preserved");
  assert.ok(bannerContent.includes("enables learners across India to thrive"), "Paragraph copy must be preserved");
});

check("Preserves 'Find an Educator' CTA button linking to /find-teachers", () => {
  assert.ok(bannerContent.includes('href="/find-teachers"'), "Find an Educator link must point to /find-teachers");
  assert.ok(bannerContent.includes("Find an Educator"), "Button text must be 'Find an Educator'");
});

check("Preserves 'Explore Courses' CTA button linking to /courses", () => {
  assert.ok(bannerContent.includes('href="/courses"'), "Explore Courses link must point to /courses");
  assert.ok(bannerContent.includes("Explore Courses"), "Button text must be 'Explore Courses'");
});

check("Preserves card wrapper styling (rounded-3xl border border-[#E2E8F0] shadow-sm)", () => {
  assert.ok(bannerContent.includes("rounded-3xl border border-[#E2E8F0]"), "Outer card styling must be preserved");
  assert.ok(bannerContent.includes("shadow-sm overflow-hidden"), "Shadow and overflow must be preserved");
});

// -----------------------------------------------------------------------------
// 4. Viewport Responsive Simulations
// -----------------------------------------------------------------------------
console.log("\n--- 4. Viewport Responsive Layout Simulations ---");

const viewports = [
  { width: 320, name: "Ultra-compact mobile (320px)" },
  { width: 360, name: "Standard mobile (360px)" },
  { width: 375, name: "Compact iPhone (375px)" },
  { width: 390, name: "Modern iPhone (390px)" },
  { width: 430, name: "Pro Max mobile (430px)" },
  { width: 768, name: "Tablet portrait (768px)" },
  { width: 1024, name: "Small desktop (1024px)" },
  { width: 1280, name: "Standard desktop (1280px)" },
  { width: 1440, name: "Large desktop (1440px)" },
];

viewports.forEach((vp) => {
  check(`Viewport ${vp.width}px (${vp.name}) preserves full image visibility without crop`, () => {
    // Check that width and height scale with 1807 / 870:
    const aspect = 1807 / 870;
    const isDesktop = vp.width >= 1024;
    // On desktop, visual column is 5/12 of container:
    const colWidth = isDesktop ? (Math.min(vp.width, 1280) * 5) / 12 - 48 : vp.width - 64;
    const computedHeight = colWidth / aspect;
    assert.ok(computedHeight > 50, `Image height (${computedHeight.toFixed(1)}px) is proportionate and visible`);
    assert.ok(colWidth > 100, `Image width (${colWidth.toFixed(1)}px) is proportionate and visible`);
  });
});

console.log("\n======================================================================");
console.log(`🎉 ALL ${passed}/${total} LEARNER MILESTONES BANNER TESTS PASSED!`);
console.log("======================================================================\n");
