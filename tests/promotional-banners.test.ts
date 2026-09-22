import { prisma } from "../lib/prisma";
import {
  validateBannerUrl,
  validateClickUrl,
  validateBannerImageUrl,
  validateBannerPayload,
  sanitizeText,
} from "../lib/banners/validation";

async function runTests() {
  console.log("==================================================");
  console.log("🧪 STARTING PROMOTIONAL BANNERS AUTOMATED VERIFICATION");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string) => {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  };

  try {
    // -------------------------------------------------------------
    // SECTION 1: URL VALIDATION & SECURITY CHECKS
    // -------------------------------------------------------------
    console.log("\n--- TEST SUITE 1: URL Validation & Security Sanitation ---");

    // 1.1 Unsafe protocols for Click URLs
    const jsUrlTest = validateBannerUrl("javascript:alert('xss')", "Image Click URL");
    assert(!jsUrlTest.isValid, "Blocks javascript: protocol for click URL");

    const dataUrlTest = validateClickUrl("data:text/html,<script>alert(1)</script>", "CTA URL");
    assert(!dataUrlTest.isValid, "Blocks data: protocol for click URL");

    const vbUrlTest = validateBannerUrl("vbscript:msgbox(1)", "Image Click URL");
    assert(!vbUrlTest.isValid, "Blocks vbscript: protocol for click URL");

    const protoRelativeTest = validateClickUrl("//attacker.com/steal", "Image Click URL");
    assert(!protoRelativeTest.isValid, "Blocks protocol-relative URLs (//)");

    // 1.2 Banner Image Storage URL Validation
    const dataImageTest = validateBannerImageUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "Banner Image URL");
    assert(!dataImageTest.isValid, "Rejects base64 data: URLs for banner image storage URL");

    const validStorageImageTest = validateBannerImageUrl("/api/banners/image/banner_123.png", "Banner Image URL");
    assert(validStorageImageTest.isValid && validStorageImageTest.cleanUrl === "/api/banners/image/banner_123.png", "Accepts stored image URL path starting with /api/banners/image/");

    const validStaticImageTest = validateBannerImageUrl("/images/educonnects-owner-banner.jpeg", "Banner Image URL");
    assert(validStaticImageTest.isValid && validStaticImageTest.cleanUrl === "/images/educonnects-owner-banner.jpeg", "Accepts static image path starting with /images/");

    const validHttpsImageTest = validateBannerImageUrl("https://cdn.example.com/banner.jpg", "Banner Image URL");
    assert(validHttpsImageTest.isValid && validHttpsImageTest.cleanUrl === "https://cdn.example.com/banner.jpg", "Accepts external HTTPS image URL");

    // 1.3 Valid internal and external click URLs
    const internalRouteTest = validateClickUrl("/courses", "CTA URL");
    assert(internalRouteTest.isValid && internalRouteTest.cleanUrl === "/courses", "Accepts relative internal route /courses");

    const deepInternalRouteTest = validateClickUrl("/teacher/training/learn", "Image Click URL");
    assert(deepInternalRouteTest.isValid && deepInternalRouteTest.cleanUrl === "/teacher/training/learn", "Accepts nested internal route");

    const externalHttpsTest = validateClickUrl("https://learners.educonnects.co.in/courses", "Image Click URL");
    assert(externalHttpsTest.isValid && externalHttpsTest.cleanUrl === "https://learners.educonnects.co.in/courses", "Accepts valid HTTPS URL");

    const emptyUrlTest = validateClickUrl("", "Image Click URL");
    assert(emptyUrlTest.isValid && emptyUrlTest.cleanUrl === undefined, "Accepts empty/null URL as non-clickable");

    // 1.4 Text sanitization
    const dirtyTitle = "<script>alert('hack')</script>Exclusive Learning Deal";
    const cleanTitle = sanitizeText(dirtyTitle);
    assert(cleanTitle === "Exclusive Learning Deal", "Strips dangerous HTML/script tags from text");

    // -------------------------------------------------------------
    // SECTION 2: PAYLOAD VALIDATION
    // -------------------------------------------------------------
    console.log("\n--- TEST SUITE 2: Full Payload Validation ---");

    const validPayload = {
      title: "Master Next.js & React Full Stack",
      subtitle: "FLAT 30% OFF",
      description: "Join verified industry experts for hands-on web development coaching.",
      bannerType: "OFFER",
      imageUrl: "/images/educonnects-owner-banner.jpeg",
      imageClickUrl: "/courses",
      imageClickTarget: "_blank",
      ctaText: "Explore Courses",
      ctaUrl: "/courses",
      placement: "ALL",
      displayOrder: 1,
      startAt: new Date(Date.now() - 3600000).toISOString(),
      endAt: new Date(Date.now() + 86400000 * 10).toISOString(),
      isActive: true,
    };

    const payloadResult = validateBannerPayload(validPayload);
    assert(payloadResult.isValid === true, "Valid payload passes all validation rules");
    assert(payloadResult.data?.imageClickTarget === "_blank", "Image click target preserved as _blank");

    const invalidTypePayload = { ...validPayload, bannerType: "INVALID_UNKNOWN_TYPE" };
    const invalidTypeResult = validateBannerPayload(invalidTypePayload);
    assert(!invalidTypeResult.isValid, "Rejects invalid bannerType");

    const invalidPlacementPayload = { ...validPayload, placement: "RANDOM_SITE" };
    const invalidPlacementResult = validateBannerPayload(invalidPlacementPayload);
    assert(!invalidPlacementResult.isValid, "Rejects invalid placement");

    const invertedDatesPayload = {
      ...validPayload,
      startAt: new Date(Date.now() + 86400000 * 5).toISOString(),
      endAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    };
    const invertedDatesResult = validateBannerPayload(invertedDatesPayload);
    assert(!invertedDatesResult.isValid, "Rejects startAt after endAt");

    // -------------------------------------------------------------
    // SECTION 3: DATABASE CRUD & SCHEDULING
    // -------------------------------------------------------------
    console.log("\n--- TEST SUITE 3: Database CRUD & Active Scheduling ---");

    // Clean up test data
    await prisma.promotionalBanner.deleteMany({
      where: { title: { startsWith: "[TEST-BANNER]" } },
    });

    // 3.1 Create Banner
    const testBanner = await prisma.promotionalBanner.create({
      data: {
        title: "[TEST-BANNER] Launch Promotion",
        subtitle: "50% Off First Month",
        description: "Welcome offer for new learners joining EduConnects live sessions.",
        bannerType: "OFFER",
        imageUrl: "/images/educonnects-owner-banner.jpeg",
        imageClickUrl: "/courses",
        imageClickTarget: "_self",
        ctaText: "Claim Offer",
        ctaUrl: "/student/courses",
        placement: "ALL",
        displayOrder: 0,
        startAt: new Date(Date.now() - 3600000), // 1 hour ago
        endAt: new Date(Date.now() + 86400000 * 7), // 7 days in future
        isActive: true,
      },
    });

    assert(Boolean(testBanner.id), "Banner created in database with UUID primary key");
    assert(testBanner.title === "[TEST-BANNER] Launch Promotion", "Banner title persisted");
    assert(testBanner.imageClickUrl === "/courses", "Image Click URL persisted");
    assert(testBanner.ctaUrl === "/student/courses", "CTA URL persisted separately from Image Click URL");
    assert(testBanner.imageClickTarget === "_self", "Image click target persisted as _self");

    // 3.2 Update Banner
    const updatedBanner = await prisma.promotionalBanner.update({
      where: { id: testBanner.id },
      data: {
        subtitle: "60% Off First Month",
        imageClickTarget: "_blank",
      },
    });

    assert(updatedBanner.subtitle === "60% Off First Month", "Banner subtitle updated");
    assert(updatedBanner.imageClickTarget === "_blank", "Banner target updated to _blank");

    // 3.3 Active / Inactive Toggle
    const deactivated = await prisma.promotionalBanner.update({
      where: { id: testBanner.id },
      data: { isActive: false },
    });
    assert(deactivated.isActive === false, "Banner successfully deactivated");

    const reactivated = await prisma.promotionalBanner.update({
      where: { id: testBanner.id },
      data: { isActive: true },
    });
    assert(reactivated.isActive === true, "Banner successfully reactivated");

    // 3.4 Date Window Scheduling & Expiry
    const expiredBanner = await prisma.promotionalBanner.create({
      data: {
        title: "[TEST-BANNER] Expired Offer",
        bannerType: "OFFER",
        imageUrl: "/images/educonnects-owner-banner.jpeg",
        placement: "ALL",
        isActive: true,
        startAt: new Date(Date.now() - 86400000 * 10),
        endAt: new Date(Date.now() - 86400000 * 2), // Expired 2 days ago
      },
    });

    const futureBanner = await prisma.promotionalBanner.create({
      data: {
        title: "[TEST-BANNER] Scheduled Future Offer",
        bannerType: "OFFER",
        imageUrl: "/images/educonnects-owner-banner.jpeg",
        placement: "ALL",
        isActive: true,
        startAt: new Date(Date.now() + 86400000 * 5), // Starts in 5 days
        endAt: new Date(Date.now() + 86400000 * 12),
      },
    });

    const now = new Date();
    const scheduledActiveBanners = await prisma.promotionalBanner.findMany({
      where: {
        title: { startsWith: "[TEST-BANNER]" },
        isActive: true,
        OR: [{ startAt: null }, { startAt: { lte: now } }],
        AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
      },
    });

    const activeTitles = scheduledActiveBanners.map((b) => b.title);
    assert(!activeTitles.includes("[TEST-BANNER] Expired Offer"), "Expired banner is excluded from active query");
    assert(!activeTitles.includes("[TEST-BANNER] Scheduled Future Offer"), "Future banner is excluded from active query");
    assert(activeTitles.includes("[TEST-BANNER] Launch Promotion"), "Current active scheduled banner is included");

    // -------------------------------------------------------------
    // SECTION 4: PLACEMENT RULES & INDEPENDENCE
    // -------------------------------------------------------------
    console.log("\n--- TEST SUITE 4: Website Placement Filtering ---");

    const learnerBanner = await prisma.promotionalBanner.create({
      data: {
        title: "[TEST-BANNER] Learner Exclusive",
        bannerType: "COURSE_PROMOTION",
        imageUrl: "/images/educonnects-owner-banner.jpeg",
        placement: "LEARNERS",
        isActive: true,
        displayOrder: 2,
      },
    });

    const educatorBanner = await prisma.promotionalBanner.create({
      data: {
        title: "[TEST-BANNER] Educator Commission Bonus",
        bannerType: "ANNOUNCEMENT",
        imageUrl: "/images/educonnects-owner-banner.jpeg",
        placement: "EDUCATORS",
        isActive: true,
        displayOrder: 3,
      },
    });

    // Query for Learner website: should get ALL + LEARNERS
    const learnerPool = await prisma.promotionalBanner.findMany({
      where: {
        title: { startsWith: "[TEST-BANNER]" },
        isActive: true,
        placement: { in: ["ALL", "LEARNERS"] },
      },
    });
    const learnerPoolTitles = learnerPool.map((b) => b.title);
    assert(learnerPoolTitles.includes("[TEST-BANNER] Launch Promotion"), "Learners site gets ALL placement banners");
    assert(learnerPoolTitles.includes("[TEST-BANNER] Learner Exclusive"), "Learners site gets LEARNERS placement banners");
    assert(!learnerPoolTitles.includes("[TEST-BANNER] Educator Commission Bonus"), "Learners site excludes EDUCATORS placement banners");

    // Query for Educator website: should get ALL + EDUCATORS
    const educatorPool = await prisma.promotionalBanner.findMany({
      where: {
        title: { startsWith: "[TEST-BANNER]" },
        isActive: true,
        placement: { in: ["ALL", "EDUCATORS"] },
      },
    });
    const educatorPoolTitles = educatorPool.map((b) => b.title);
    assert(educatorPoolTitles.includes("[TEST-BANNER] Launch Promotion"), "Educators site gets ALL placement banners");
    assert(educatorPoolTitles.includes("[TEST-BANNER] Educator Commission Bonus"), "Educators site gets EDUCATORS placement banners");
    assert(!educatorPoolTitles.includes("[TEST-BANNER] Learner Exclusive"), "Educators site excludes LEARNERS placement banners");

    // -------------------------------------------------------------
    // SECTION 5: DISPLAY ORDERING & CLEANUP
    // -------------------------------------------------------------
    console.log("\n--- TEST SUITE 5: Display Order Sorting & Deletion ---");

    const orderedBanners = await prisma.promotionalBanner.findMany({
      where: { title: { startsWith: "[TEST-BANNER]" } },
      orderBy: { displayOrder: "asc" },
    });

    for (let i = 0; i < orderedBanners.length - 1; i++) {
      assert(
        orderedBanners[i].displayOrder <= orderedBanners[i + 1].displayOrder,
        `Banners sorted in ascending order: ${orderedBanners[i].displayOrder} <= ${orderedBanners[i + 1].displayOrder}`
      );
    }

    // Deletion
    await prisma.promotionalBanner.delete({
      where: { id: testBanner.id },
    });
    const deletedCheck = await prisma.promotionalBanner.findUnique({
      where: { id: testBanner.id },
    });
    assert(deletedCheck === null, "Banner deleted successfully from database");

    // Clean up remaining test banners
    await prisma.promotionalBanner.deleteMany({
      where: { title: { startsWith: "[TEST-BANNER]" } },
    });
    console.log("🧹 Test banners cleaned up.");

  } catch (err: any) {
    console.error("Test execution error:", err);
    failed++;
  }

  console.log("\n==================================================");
  console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
