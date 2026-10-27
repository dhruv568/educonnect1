import fs from "fs";
import path from "path";

console.log("=======================================================");
console.log("🧪 TESTING FOUNDER BRAND VISION POSTER UPDATE");
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

const componentPath = path.join(
  process.cwd(),
  "components",
  "homepage",
  "brand-vision-section.tsx"
);
const componentContent = fs.readFileSync(componentPath, "utf-8");

const imagePath = path.join(
  process.cwd(),
  "public",
  "images",
  "educonnects-vision-poster-neeraj-shrivastava.jpg"
);

// 1. Asset verification
console.log("--- 1. Asset File Verification ---");
assert(fs.existsSync(imagePath), "New image file exists at public/images/educonnects-vision-poster-neeraj-shrivastava.jpg");
const stats = fs.statSync(imagePath);
assert(stats.size > 100000, `Image file size is valid (${stats.size} bytes)`);

// 2. Component references
console.log("\n--- 2. Component Code & Import Verification ---");
assert(
  componentContent.includes(
    'import visionPoster from "@/public/images/educonnects-vision-poster-neeraj-shrivastava.jpg"'
  ),
  "Component imports new Neeraj Shrivastava poster directly"
);
assert(
  !componentContent.includes('import photo1 from "@/photo1.jpeg"'),
  "Component no longer imports old photo1.jpeg (Sameer Shrivastava poster)"
);
assert(
  componentContent.includes("src={visionPoster}"),
  "Image tag renders src={visionPoster}"
);
assert(
  componentContent.includes("Founder Neeraj Shrivastava"),
  "Alt text includes 'Founder Neeraj Shrivastava'"
);

// 3. Layout preservation
console.log("\n--- 3. Card Layout & Aspect Ratio Preservation ---");
assert(
  componentContent.includes("aspect-square w-full rounded-2xl overflow-hidden"),
  "Aspect-square 1:1 container with rounded-2xl and overflow-hidden is preserved"
);
assert(
  componentContent.includes("object-contain"),
  "object-contain class is preserved to prevent cropping any poster content"
);
assert(
  componentContent.includes("p-3 sm:p-4 rounded-3xl bg-white border border-[#E2E8F0] shadow-2xl"),
  "Card styling (p-3 sm:p-4 rounded-3xl, shadow-2xl, border) is preserved"
);

// 4. Surrounding content preservation
console.log("\n--- 4. Section Copy & Content Preservation ---");
assert(
  componentContent.includes("Our Vision In Two Words"),
  "Section badge 'Our Vision In Two Words' is preserved"
);
assert(
  componentContent.includes("Better Learning. <br />"),
  "Headline 'Better Learning. Brighter Tomorrows.' is preserved"
);
assert(
  componentContent.includes("Empower Learners") &&
    componentContent.includes("Support Educators") &&
    componentContent.includes("Expand Opportunities") &&
    componentContent.includes("Create Brighter Futures"),
  "All 4 core pillars are preserved"
);
assert(
  componentContent.includes("Learn • Grow • Belong") &&
    componentContent.includes("EduConnects Core Vision"),
  "Bottom caption pill is preserved"
);

console.log("\n=======================================================");
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("=======================================================");

if (failed > 0) {
  process.exit(1);
}
