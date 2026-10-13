import fs from "fs";
import path from "path";
import assert from "assert";

console.log("🧪 Starting Domain-Specific Logo Verification Test Suite...\n");

const rootDir = process.cwd();

// TEST 1: Logo Files on Disk
console.log("📋 TEST 1: Verifying physical existence and dimensions of domain logos...");
const logoFiles = [
  { name: "educonnects.co.in.png", portal: "Main Website", domain: "educonnects.co.in" },
  { name: "learmers.educonnects.co.in.png", portal: "Learner Portal", domain: "learners.educonnects.co.in" },
  { name: "educators.educonnects.co.in.png", portal: "Educator Portal", domain: "educators.educonnects.co.in" },
];

logoFiles.forEach((logo) => {
  const filePath = path.join(rootDir, logo.name);
  assert.ok(fs.existsSync(filePath), `File ${logo.name} must exist in repository root`);
  
  const buffer = fs.readFileSync(filePath);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const ratio = width / height;

  assert.strictEqual(width, 1536, `${logo.name} width should be 1536px`);
  assert.strictEqual(height, 1024, `${logo.name} height should be 1024px`);
  assert.strictEqual(ratio, 1.5, `${logo.name} aspect ratio must be exactly 3:2 (1.5)`);
  console.log(`  ✅ [PASS] ${logo.portal} (${logo.name}): ${width}x${height} (ratio ${ratio}) verified.`);
});

// TEST 2: Logo Component Implementation
console.log("\n📋 TEST 2: Verifying components/brand/logo.tsx implementation...");
const logoTsxPath = path.join(rootDir, "components", "brand", "logo.tsx");
const logoTsx = fs.readFileSync(logoTsxPath, "utf-8");

assert.ok(logoTsx.includes('import mainLogo from "@/educonnects.co.in.png"'), "Imports main domain logo");
assert.ok(logoTsx.includes('import learnerLogo from "@/learmers.educonnects.co.in.png"'), "Imports learner domain logo");
assert.ok(logoTsx.includes('import educatorLogo from "@/educators.educonnects.co.in.png"'), "Imports educator domain logo");
assert.ok(logoTsx.includes("EduConnects Main Logo"), "Provides EduConnects Main Logo alt text");
assert.ok(logoTsx.includes("EduConnects Learner Portal Logo"), "Provides EduConnects Learner Portal Logo alt text");
assert.ok(logoTsx.includes("EduConnects Educator Portal Logo"), "Provides EduConnects Educator Portal Logo alt text");
assert.ok(logoTsx.includes("object-contain"), "Uses object-contain to prevent stretching or distortion");
assert.ok(logoTsx.includes("aspect-[3/2]"), "Enforces 3:2 aspect ratio container");
console.log("  ✅ [PASS] components/brand/logo.tsx correctly maps all 3 domain logos with alt text and 3:2 aspect ratio.");

// TEST 3: Header Component (FloatingNavbar)
console.log("\n📋 TEST 3: Verifying components/homepage/floating-navbar.tsx headers...");
const navbarPath = path.join(rootDir, "components", "homepage", "floating-navbar.tsx");
const navbarTsx = fs.readFileSync(navbarPath, "utf-8");

// Educator desktop & mobile headers
assert.ok(navbarTsx.includes("src={educatorLogo}"), "Educator navbar uses educatorLogo");
assert.ok(navbarTsx.includes('alt="EduConnects Educator Portal Logo"'), "Educator navbar has educator alt text");

// Learner desktop & mobile headers
assert.ok(navbarTsx.includes("src={learnerLogo}"), "Learner navbar uses learnerLogo");
assert.ok(navbarTsx.includes('alt="EduConnects Learner Portal Logo"'), "Learner navbar has learner alt text");

// Main desktop & mobile headers
assert.ok(navbarTsx.includes('alt="EduConnects Main Logo"'), "Main website navbar has main logo alt text");
assert.ok(navbarTsx.includes('portal="main"'), "Main website navbar explicitly passes portal='main'");
console.log("  ✅ [PASS] FloatingNavbar header correctly wires all 3 domains for desktop and mobile.");

// TEST 4: Footer Component (PremiumFooter)
console.log("\n📋 TEST 4: Verifying components/homepage/premium-footer.tsx footers...");
const footerPath = path.join(rootDir, "components", "homepage", "premium-footer.tsx");
const footerTsx = fs.readFileSync(footerPath, "utf-8");

assert.ok(footerTsx.includes('portal={isEducator ? "educator" : isLearner ? "learner" : "main"}'), "Footer dynamically supplies portal prop");
assert.ok(footerTsx.includes('EduConnects Educator Portal Logo'), "Footer configures Educator Logo alt");
assert.ok(footerTsx.includes('EduConnects Learner Portal Logo'), "Footer configures Learner Logo alt");
assert.ok(footerTsx.includes('EduConnects Main Logo'), "Footer configures Main Logo alt");
assert.ok(footerTsx.includes('href={isEducator ? "/teacher" : isLearner ? "/student" : "/"}'), "Footer logo links to correct domain homepage");
console.log("  ✅ [PASS] PremiumFooter footer correctly wires domain logos and links.");

// TEST 5: Dashboard Layout (DashboardLayout)
console.log("\n📋 TEST 5: Verifying components/layout/dashboard-layout.tsx layout...");
const dashPath = path.join(rootDir, "components", "layout", "dashboard-layout.tsx");
const dashTsx = fs.readFileSync(dashPath, "utf-8");

assert.ok(dashTsx.includes('portal={isEducator ? "educator" : isAdminOrStaff ? "main" : "learner"}'), "Dashboard dynamically maps educator, admin, and learner portal logos");
console.log("  ✅ [PASS] DashboardLayout correctly wires domain logos.");

console.log("\n==================================================");
console.log("🎉 All Logo Domain Mapping Tests PASSED! (5/5)");
console.log("==================================================");
