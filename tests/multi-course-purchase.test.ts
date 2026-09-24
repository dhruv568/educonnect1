import { prisma } from "../lib/prisma";
import { LmsService } from "../services/lms-service";
import { PaymentService } from "../services/payment-service";
import { AnalyticsService } from "../services/analytics-service";
import crypto from "crypto";

async function runMultiCoursePurchaseTests() {
  console.log("🧪 Starting Multi-Course Purchasing & Enrollment Test Suite...\n");

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      failedTests++;
    }
  }

  try {
    const randomSuffix = crypto.randomBytes(4).toString("hex");

    // 1. Setup Test Educator & Student
    const teacherUser = await prisma.user.create({
      data: {
        email: `teacher.multicourse.${randomSuffix}@educonnects.com`,
        passwordHash: "$2a$10$xyz",
        role: "TEACHER",
        emailVerified: true,
        profile: {
          create: {
            firstName: "Dr. Alan",
            lastName: "Turing",
          },
        },
        teacherProfile: {
          create: {
            headline: "Computer Science Educator",
            verificationStatus: "VERIFIED",
            rating: 5.0,
          },
        },
      },
      include: { teacherProfile: true },
    });

    const studentUser = await prisma.user.create({
      data: {
        email: `student.multicourse.${randomSuffix}@educonnects.com`,
        passwordHash: "$2a$10$xyz",
        role: "STUDENT",
        emailVerified: true,
        profile: {
          create: {
            firstName: "Ada",
            lastName: "Lovelace",
          },
        },
      },
    });

    // 2. Create Two Published Courses
    const courseA = await prisma.course.create({
      data: {
        teacherId: teacherUser.teacherProfile!.id,
        title: `Algorithms & Data Structures ${randomSuffix}`,
        slug: `algorithms-ds-${randomSuffix}`,
        description: "Complete guide to algorithms and data structures.",
        subject: "Computer Science",
        level: "BEGINNER",
        price: 0, // Free course A
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    const secA = await prisma.courseSection.create({
      data: { courseId: courseA.id, title: "Section 1", order: 1 },
    });
    const lesA1 = await prisma.courseLesson.create({
      data: { sectionId: secA.id, title: "Arrays & Linked Lists", type: "TEXT", order: 1, durationSeconds: 600 },
    });

    const courseB = await prisma.course.create({
      data: {
        teacherId: teacherUser.teacherProfile!.id,
        title: `Advanced Web Development ${randomSuffix}`,
        slug: `advanced-web-dev-${randomSuffix}`,
        description: "Full-stack web application development.",
        subject: "Web Development",
        level: "INTERMEDIATE",
        price: 999, // Paid course B
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });

    const secB = await prisma.courseSection.create({
      data: { courseId: courseB.id, title: "Section 1", order: 1 },
    });
    const lesB1 = await prisma.courseLesson.create({
      data: { sectionId: secB.id, title: "React & Next.js Basics", type: "TEXT", order: 1, durationSeconds: 1200 },
    });

    console.log("📌 1. Test Learner Purchasing First Course (Course A)...");
    const enrollAResult = await LmsService.enrollStudent(studentUser.id, courseA.id);
    assert(enrollAResult.enrollment.status === "ACTIVE", "Learner successfully enrolled in Course A");
    assert(!enrollAResult.alreadyEnrolled, "Course A was not previously enrolled");

    console.log("\n📌 2. Test Learner Purchasing Second Course (Course B via Payment Order & Verification)...");
    // Create payment order for Course B
    const orderB = await PaymentService.createPaymentOrder({
      userId: studentUser.id,
      type: "COURSE_ENROLLMENT",
      courseId: courseB.id,
    });
    assert(orderB.cfOrderId !== undefined, "Payment order created for Course B");

    // Complete / verify payment for Course B
    const verifyB = await PaymentService.verifyAndCompletePayment({
      userId: studentUser.id,
      orderId: orderB.cfOrderId!,
      paymentStatus: "SUCCESS",
    });
    assert(verifyB.status === "CAPTURED", "Payment captured and Course B activated for learner");

    console.log("\n📌 3. Test Preventing Duplicate Purchase of Same Course (Course A & Course B)...");
    const duplicateEnrollA = await LmsService.enrollStudent(studentUser.id, courseA.id);
    assert(duplicateEnrollA.alreadyEnrolled === true, "Duplicate enrollment attempt in Course A flagged as alreadyEnrolled");

    let duplicatePaymentError = "";
    try {
      await PaymentService.createPaymentOrder({
        userId: studentUser.id,
        type: "COURSE_ENROLLMENT",
        courseId: courseB.id,
      });
    } catch (err: any) {
      duplicatePaymentError = err.message;
    }
    assert(duplicatePaymentError.includes("DUPLICATE_PURCHASE"), "PaymentService blocks duplicate purchase of Course B with DUPLICATE_PURCHASE error");

    console.log("\n📌 4. Test Course-Specific Lesson Progress & Isolation...");
    // Update progress on Course A
    const progA = await LmsService.updateLessonProgress(studentUser.id, lesA1.id, 600, true);
    assert(progA.lessonCompleted === true, "Lesson progress updated for Course A");

    // Check student enrolled courses API
    const enrolledCoursesData = await LmsService.getStudentEnrolledCourses(studentUser.id);
    assert(enrolledCoursesData.enrolledCourses.length === 2, "getStudentEnrolledCourses returns both purchased courses");

    const courseAItem = enrolledCoursesData.enrolledCourses.find((c) => c.course.id === courseA.id);
    const courseBItem = enrolledCoursesData.enrolledCourses.find((c) => c.course.id === courseB.id);

    assert(courseAItem?.progressPercent === 100, "Course A shows 100% progress");
    assert(courseBItem?.progressPercent === 0, "Course B shows 0% progress (independent progress tracking verified)");

    console.log("\n📌 5. Test Student Dashboard Multi-Course Summary...");
    const dashboardData = await AnalyticsService.getStudentDashboardData(studentUser.id);
    const totalEnrolled = dashboardData.stats.enrolledCount + dashboardData.stats.completedCoursesCount;
    assert(totalEnrolled >= 2, "Dashboard stats count all enrolled courses (active + completed)");
    assert(dashboardData.enrolledCourses.length >= 2, "Dashboard enrolledCourses summary returns all purchased courses");

    // Clean up test data
    await prisma.user.delete({ where: { id: teacherUser.id } });
    await prisma.user.delete({ where: { id: studentUser.id } });

    console.log("\n🎉 ALL MULTI-COURSE PURCHASING TESTS PASSED!");
  } catch (err) {
    console.error("❌ Test suite failed with error:", err);
    failedTests++;
  }

  if (failedTests > 0) {
    console.error(`\n❌ ${failedTests} test(s) failed.`);
    process.exit(1);
  } else {
    console.log(`\n✅ ${passedTests} test(s) passed successfully.`);
  }
}

runMultiCoursePurchaseTests().finally(() => process.exit(0));
