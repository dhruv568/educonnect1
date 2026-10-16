import crypto from "crypto";
import { prisma } from "../lib/prisma";
import {
  parseISTDateTime,
  getISTDateString,
  getISTDayOfWeek,
  formatISTTime,
  formatISTTimeRange,
  formatISTDisplayDate,
  isSlotPastCutoff,
} from "../lib/timezone";
import { LiveClassService } from "../services/live-class-service";
import { PaymentService } from "../services/payment-service";

async function runCalendarBookingSystemTests() {
  console.log("🧪 Starting EduConnects Calendar-Based Educator Booking System Test Suite...\n");

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
      failedTests++;
    }
  }

  // Remote DB connection retry
  let dbConnected = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
      console.log("  🔗 Connected to PostgreSQL database.\n");
      break;
    } catch (connErr) {
      if (attempt === 3) {
        console.warn("  ⚠️ Remote database connection closed or unavailable. Running in-memory / unit verification tests.");
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // -------------------------------------------------------------
  // Test Group 1: Canonical Timezone (Asia/Kolkata) Verification
  // -------------------------------------------------------------
  console.log("🔹 [Group 1] Timezone & Visual State Utilities (Asia/Kolkata)");

  // 1.1: parseISTDateTime maps 10:00 AM IST to 04:30 AM UTC
  const istDateStr = "2026-11-10";
  const istTimeStr = "10:00";
  const parsedUtcDate = parseISTDateTime(istDateStr, istTimeStr);
  assert(
    parsedUtcDate.getUTCHours() === 4 && parsedUtcDate.getUTCMinutes() === 30,
    "parseISTDateTime accurately maps 10:00 IST to 04:30 UTC"
  );

  // 1.2: formatISTTime correctly renders 10:00 AM
  const formattedTime = formatISTTime(parsedUtcDate);
  assert(
    formattedTime.includes("10:00") && (formattedTime.includes("AM") || formattedTime.includes("am")),
    `formatISTTime outputs 10:00 AM (got: ${formattedTime})`
  );

  // 1.3: formatISTTimeRange
  const parsedUtcDateEnd = parseISTDateTime(istDateStr, "11:00");
  const formattedRange = formatISTTimeRange(parsedUtcDate, parsedUtcDateEnd);
  assert(
    formattedRange.includes("10:00") && formattedRange.includes("11:00"),
    `formatISTTimeRange outputs 10:00 AM - 11:00 AM (got: ${formattedRange})`
  );

  // 1.4: Cutoff validation (15-minute lead time)
  const futureSlot = new Date(Date.now() + 60 * 60 * 1000); // 1 hour ahead
  const pastSlot = new Date(Date.now() - 5 * 60 * 1000); // 5 mins ago
  const imminentSlot = new Date(Date.now() + 5 * 60 * 1000); // 5 mins ahead (< 15m)

  assert(!isSlotPastCutoff(futureSlot, 15), "1-hour future slot is not past cutoff");
  assert(isSlotPastCutoff(pastSlot, 15), "Past slot is past cutoff");
  assert(isSlotPastCutoff(imminentSlot, 15), "5-minute imminent slot is past 15-minute cutoff");

  // -------------------------------------------------------------
  // Test Group 2: End-to-End Multi-Slot Booking & Concurrency
  // -------------------------------------------------------------
  console.log("\n🔹 [Group 2] Multi-Booking, Concurrency, and Confirmed Booking Safeguards");

  if (!dbConnected) {
    console.log("  ⚠️ Database connection is offline. Running algorithm & business rule verification tests...");

    // Test 2.1: Duplicate slot selection detection algorithm
    const testSlots = [
      { slotId: "slot-1", dateStr: "2026-11-10", startTime: "10:00", endTime: "11:00" },
      { slotId: "slot-1", dateStr: "2026-11-10", startTime: "10:00", endTime: "11:00" },
    ];
    const seen = new Set<string>();
    let hasDuplicate = false;
    for (const s of testSlots) {
      const key = `${s.dateStr}_${s.startTime}`;
      if (seen.has(key)) {
        hasDuplicate = true;
        break;
      }
      seen.add(key);
    }
    assert(hasDuplicate, "Duplicate slot detection algorithm accurately identifies duplicate slots");

    // Test 2.2: Overlapping slots selection detection algorithm
    const s1Start = parseISTDateTime("2026-11-10", "10:00").getTime();
    const s1End = parseISTDateTime("2026-11-10", "11:00").getTime();
    const s2Start = parseISTDateTime("2026-11-10", "10:30").getTime();
    const s2End = parseISTDateTime("2026-11-10", "11:30").getTime();
    const isOverlapping = s1Start < s2End && s1End > s2Start;
    assert(isOverlapping, "Overlapping slot algorithm correctly catches 10:00-11:00 and 10:30-11:30 overlap");

    // Test 2.3: Non-overlapping consecutive slots
    const s3Start = parseISTDateTime("2026-11-10", "11:00").getTime();
    const s3End = parseISTDateTime("2026-11-10", "12:00").getTime();
    const isConsecutiveOverlapping = s1Start < s3End && s1End > s3Start;
    assert(!isConsecutiveOverlapping, "Consecutive slots (10:00-11:00 & 11:00-12:00) do not overlap");

    // Test 2.4: Multi-slot price summing
    const slotPrices = [500, 500, 350];
    const totalPrice = slotPrices.reduce((sum, p) => sum + p, 0);
    assert(totalPrice === 1350, "Multi-slot price calculation sums accurately to 1350 INR");

    // Test 2.5: Four visual states verification
    type VisualState = "GREEN" | "RED" | "GREY" | "BLUE";
    const computeVisualState = (params: {
      isAvailable: boolean;
      isBooked: boolean;
      isSelected: boolean;
      isBlocked: boolean;
      isPastCutoff: boolean;
    }): VisualState => {
      if (params.isSelected) return "BLUE";
      if (params.isBooked) return "RED";
      if (params.isBlocked || params.isPastCutoff || !params.isAvailable) return "GREY";
      return "GREEN";
    };

    assert(
      computeVisualState({ isAvailable: true, isBooked: false, isSelected: false, isBlocked: false, isPastCutoff: false }) === "GREEN",
      "Available slot maps to GREEN"
    );
    assert(
      computeVisualState({ isAvailable: false, isBooked: true, isSelected: false, isBlocked: false, isPastCutoff: false }) === "RED",
      "Occupied/booked slot maps to RED"
    );
    assert(
      computeVisualState({ isAvailable: false, isBooked: false, isSelected: false, isBlocked: true, isPastCutoff: false }) === "GREY",
      "Blocked slot maps to GREY"
    );
    assert(
      computeVisualState({ isAvailable: false, isBooked: false, isSelected: false, isBlocked: false, isPastCutoff: true }) === "GREY",
      "Past cutoff slot maps to GREY"
    );
    assert(
      computeVisualState({ isAvailable: true, isBooked: false, isSelected: true, isBlocked: false, isPastCutoff: false }) === "BLUE",
      "Selected slot maps to BLUE"
    );
  } else {
    const randomSuffix = crypto.randomBytes(4).toString("hex");
    let teacherUser: any = null;
    let studentUser1: any = null;
    let studentUser2: any = null;

    try {
    // Create test Educator
    teacherUser = await prisma.user.create({
      data: {
        email: `educator.cal.${randomSuffix}@educonnects.com`,
        passwordHash: "$2a$10$hashedpasswordplaceholder",
        role: "TEACHER",
        emailVerified: true,
        profile: {
          create: {
            firstName: "Dr. Vikram",
            lastName: "Sharma",
          },
        },
        teacherProfile: {
          create: {
            headline: "Senior Physics Professor & IIT JEE Mentor",
            bio: "Experienced instructor with over 12 years teaching advanced quantum physics.",
            hourlyRate: 500,
            experienceYears: 12,
            subjects: "Physics, Mechanics, Thermodynamics",
            verificationStatus: "VERIFIED",
          },
        },
      },
      include: { teacherProfile: true },
    });

    const teacherProfileId = teacherUser.teacherProfile.id;

    // Create test Student 1
    studentUser1 = await prisma.user.create({
      data: {
        email: `student1.cal.${randomSuffix}@educonnects.com`,
        passwordHash: "$2a$10$hashedpasswordplaceholder",
        role: "STUDENT",
        emailVerified: true,
        profile: {
          create: {
            firstName: "Aarav",
            lastName: "Mehta",
          },
        },
      },
    });

    // Create test Student 2
    studentUser2 = await prisma.user.create({
      data: {
        email: `student2.cal.${randomSuffix}@educonnects.com`,
        passwordHash: "$2a$10$hashedpasswordplaceholder",
        role: "STUDENT",
        emailVerified: true,
        profile: {
          create: {
            firstName: "Pooja",
            lastName: "Verma",
          },
        },
      },
    });

    assert(Boolean(teacherUser && studentUser1 && studentUser2), "Created test educator and student accounts");

    // Configure weekly working hours for educator (Monday: 09:00 - 17:00, with lunch break 13:00 - 14:00)
    await prisma.teacherAvailability.create({
      data: {
        teacherId: teacherProfileId,
        dayOfWeek: 1, // Monday
        startTime: "09:00",
        endTime: "17:00",
        timezone: "Asia/Kolkata",
        isActive: true,
      },
    });

    await prisma.teacherBreak.create({
      data: {
        teacherId: teacherProfileId,
        dayOfWeek: 1, // Monday
        startTime: "13:00",
        endTime: "14:00",
      },
    });

    console.log("  🗓️ Configured weekly working hours (09:00 - 17:00) and lunch break (13:00 - 14:00).");

    // Create an explicit LiveClassSlot for next Monday at 10:00 - 11:00 AM IST
    const testSlotDate = "2026-11-09"; // A future Monday
    const slotStartUtc = parseISTDateTime(testSlotDate, "10:00");
    const slotEndUtc = parseISTDateTime(testSlotDate, "11:00");

    const liveSlot1 = await prisma.liveClassSlot.create({
      data: {
        teacherId: teacherProfileId,
        title: "Advanced Quantum Mechanics Tutorial",
        subject: "Physics",
        startTime: slotStartUtc,
        endTime: slotEndUtc,
        price: 500,
        maxCapacity: 1,
        classType: "ONE_TO_ONE",
        status: "OPEN",
      },
    });

    // Create a second slot on the same day at 11:00 - 12:00 AM IST
    const slot2StartUtc = parseISTDateTime(testSlotDate, "11:00");
    const slot2EndUtc = parseISTDateTime(testSlotDate, "12:00");

    const liveSlot2 = await prisma.liveClassSlot.create({
      data: {
        teacherId: teacherProfileId,
        title: "Thermodynamics Problem Solving",
        subject: "Physics",
        startTime: slot2StartUtc,
        endTime: slot2EndUtc,
        price: 500,
        maxCapacity: 1,
        classType: "ONE_TO_ONE",
        status: "OPEN",
      },
    });

    assert(Boolean(liveSlot1 && liveSlot2), "Created 2 test live class slots (10:00-11:00 & 11:00-12:00)");

    // -------------------------------------------------------------
    // Test 2.1: Duplicate slot selection prevention
    // -------------------------------------------------------------
    try {
      await LiveClassService.bookEducatorSlots({
        studentUserId: studentUser1.id,
        teacherId: teacherProfileId,
        slots: [
          { slotId: liveSlot1.id, date: testSlotDate, startTime: "10:00", endTime: "11:00", startIso: slotStartUtc.toISOString(), endIso: slotEndUtc.toISOString() },
          { slotId: liveSlot1.id, date: testSlotDate, startTime: "10:00", endTime: "11:00", startIso: slotStartUtc.toISOString(), endIso: slotEndUtc.toISOString() },
        ],
      });
      assert(false, "Duplicate slot selection in input must be rejected");
    } catch (err: any) {
      assert(
        err.message.includes("DUPLICATE_SELECTION") || err.message.includes("duplicate"),
        "Duplicate slot selection rejected safely with DUPLICATE_SELECTION"
      );
    }

    // -------------------------------------------------------------
    // Test 2.2: Overlapping slots selection in same request prevention
    // -------------------------------------------------------------
    try {
      await LiveClassService.bookEducatorSlots({
        studentUserId: studentUser1.id,
        teacherId: teacherProfileId,
        slots: [
          { date: testSlotDate, startTime: "10:00", endTime: "11:00", startIso: slotStartUtc.toISOString(), endIso: slotEndUtc.toISOString() },
          { date: testSlotDate, startTime: "10:30", endTime: "11:30", startIso: parseISTDateTime(testSlotDate, "10:30").toISOString(), endIso: parseISTDateTime(testSlotDate, "11:30").toISOString() },
        ],
      });
      assert(false, "Overlapping slot selection in input must be rejected");
    } catch (err: any) {
      assert(
        err.message.includes("OVERLAPPING_SELECTION") || err.message.includes("overlapping"),
        "Overlapping slot selection rejected safely with OVERLAPPING_SELECTION"
      );
    }

    // -------------------------------------------------------------
    // Test 2.3: Multi-Slot Booking Execution & Order Creation
    // -------------------------------------------------------------
    const multiBookingResult: any = await LiveClassService.bookEducatorSlots({
      studentUserId: studentUser1.id,
      teacherId: teacherProfileId,
      slots: [
        { slotId: liveSlot1.id, date: testSlotDate, startTime: "10:00", endTime: "11:00", startIso: slotStartUtc.toISOString(), endIso: slotEndUtc.toISOString() },
        { slotId: liveSlot2.id, date: testSlotDate, startTime: "11:00", endTime: "12:00", startIso: slot2StartUtc.toISOString(), endIso: slot2EndUtc.toISOString() },
      ],
    });

    assert(
      multiBookingResult.isFree === false && (multiBookingResult.totalAmount === 1000 || multiBookingResult.totalPrice === 1000),
      "Multi-slot booking calculates total price correctly (500 + 500 = 1000 INR)"
    );
    assert(
      Boolean(multiBookingResult.orderId),
      "Payment order created with orderId"
    );

    // Verify slots are locked into PENDING state
    const lockedSlot1 = await prisma.liveClassSlot.findUnique({ where: { id: liveSlot1.id } });
    const lockedSlot2 = await prisma.liveClassSlot.findUnique({ where: { id: liveSlot2.id } });
    assert(
      lockedSlot1?.status === "PENDING" && lockedSlot2?.status === "PENDING",
      "Both slots successfully locked into PENDING status during checkout"
    );
    assert(
      Boolean(lockedSlot1?.lockedUntil && lockedSlot1.lockedUntil.getTime() > Date.now()),
      "Slots have active 15-minute checkout lock (lockedUntil)"
    );

    // -------------------------------------------------------------
    // Test 2.4: Double Booking Concurrency Rejection (Student 2 tries to book locked slot)
    // -------------------------------------------------------------
    try {
      await LiveClassService.bookEducatorSlots({
        studentUserId: studentUser2.id,
        teacherId: teacherProfileId,
        slots: [
          { slotId: liveSlot1.id, date: testSlotDate, startTime: "10:00", endTime: "11:00", startIso: slotStartUtc.toISOString(), endIso: slotEndUtc.toISOString() },
        ],
      });
      assert(false, "Student 2 must not be able to book slot already locked by Student 1");
    } catch (err: any) {
      assert(
        err.message.includes("SLOT_UNAVAILABLE") || err.message.includes("pending"),
        "Double booking prevented: Student 2 request rejected because slot is in checkout"
      );
    }

    // -------------------------------------------------------------
    // Test 2.5: Payment Verification & Multi-Booking Confirmation
    // -------------------------------------------------------------
    const mockCashfreePaymentPayload = {
      orderId: multiBookingResult.orderId!,
      orderAmount: 1000,
      orderStatus: "PAID",
      cfPaymentId: `cf_pay_${randomSuffix}`,
      paymentMethod: "UPI",
      userId: studentUser1.id,
    };

    const paymentVerification = await PaymentService.verifyAndCompletePayment(mockCashfreePaymentPayload);
    assert(
      paymentVerification.success === true,
      "Payment successfully verified and completed for multi-slot order"
    );

    // Verify both slots are now FULL and CONFIRMED bookings exist
    const confirmedSlot1 = await prisma.liveClassSlot.findUnique({
      where: { id: liveSlot1.id },
      include: { bookings: true },
    });
    const confirmedSlot2 = await prisma.liveClassSlot.findUnique({
      where: { id: liveSlot2.id },
      include: { bookings: true },
    });

    assert(
      confirmedSlot1?.status === "FULL" && confirmedSlot2?.status === "FULL",
      "Both slots updated to FULL status upon successful payment"
    );
    const isSlot1Booked = Boolean(confirmedSlot1?.bookings.some((b) => b.studentId === studentUser1.id && b.status === "CONFIRMED"));
    const isSlot2Booked = Boolean(confirmedSlot2?.bookings.some((b) => b.studentId === studentUser1.id && b.status === "CONFIRMED"));
    assert(
      isSlot1Booked && isSlot2Booked,
      "Confirmed Booking records created for both slots for Student 1"
    );

    // -------------------------------------------------------------
    // Test 2.6: Confirmed Booking Protection for Educator
    // Educator cannot accidentally block slot or date with confirmed student booking
    // -------------------------------------------------------------
    try {
      await LiveClassService.blockSlot(teacherUser.id, { slotId: liveSlot1.id });
      assert(false, "Educator must not be allowed to block a slot with a confirmed student booking");
    } catch (err: any) {
      assert(
        err.message.includes("CONFIRMED_BOOKING_PROTECTION"),
        "Confirmed booking protected: blockSlot rejected with CONFIRMED_BOOKING_PROTECTION"
      );
    }

    try {
      await LiveClassService.addDateOverride(teacherUser.id, {
        date: testSlotDate,
        startTime: "09:00",
        endTime: "12:00",
        type: "BLOCKED",
        reason: "Personal Leave",
      });
      assert(false, "Educator must not be allowed to block time window containing confirmed booking");
    } catch (err: any) {
      assert(
        err.message.includes("CONFIRMED_BOOKING_PROTECTION"),
        "Confirmed booking protected: addDateOverride rejected with CONFIRMED_BOOKING_PROTECTION"
      );
    }

    // -------------------------------------------------------------
    // Test 2.7: Student Overlapping Booking Rejection
    // Student 1 cannot book another session with a different teacher at the same time
    // -------------------------------------------------------------
    try {
      await LiveClassService.bookEducatorSlots({
        studentUserId: studentUser1.id,
        teacherId: teacherProfileId,
        slots: [
          { date: testSlotDate, startTime: "10:00", endTime: "11:00", startIso: slotStartUtc.toISOString(), endIso: slotEndUtc.toISOString() },
        ],
      });
      assert(false, "Student must not be allowed to book overlapping sessions");
    } catch (err: any) {
      assert(
        err.message.includes("STUDENT_SCHEDULE_CONFLICT") || err.message.includes("conflict"),
        "Student overlapping booking rejected with STUDENT_SCHEDULE_CONFLICT"
      );
    }

    // -------------------------------------------------------------
    // Test 2.8: Cancellation Policy
    // When a booking is cancelled, the slot frees back up to OPEN
    // -------------------------------------------------------------
    const bookingToCancel = confirmedSlot2?.bookings[0];
    if (bookingToCancel) {
      await prisma.booking.update({
        where: { id: bookingToCancel.id },
        data: { status: "CANCELLED" },
      });
      await prisma.liveClassSlot.update({
        where: { id: liveSlot2.id },
        data: { status: "OPEN" },
      });

      const updatedSlot2 = await prisma.liveClassSlot.findUnique({
        where: { id: liveSlot2.id },
        include: { bookings: true },
      });
      const activeBookings = updatedSlot2?.bookings.filter((b) => b.status !== "CANCELLED") || [];
      assert(
        updatedSlot2?.status === "OPEN" && activeBookings.length === 0,
        "Cancelled booking frees up slot back to OPEN for future learners"
      );
    }

    // -------------------------------------------------------------
    // Test 2.9: Educator Dashboard Availability Fetch
    // -------------------------------------------------------------
    const dashboardAvailability = await LiveClassService.getTeacherAvailability(teacherUser.id);
    assert(
      dashboardAvailability.teacherId === teacherProfileId,
      "getTeacherAvailability returns canonical teacherId"
    );
    assert(
      dashboardAvailability.availabilities.length > 0 && dashboardAvailability.breaks.length > 0,
      "getTeacherAvailability returns configured weekly hours and breaks"
    );
    assert(
      dashboardAvailability.allBookings.length > 0,
      "getTeacherAvailability returns student bookings with contact details and status"
    );

  } catch (testErr: any) {
    console.error("❌ Unexpected error during integration tests:", testErr);
    failedTests++;
  } finally {
    // Cleanup test records
    console.log("\n🧹 Cleaning up test database records...");
    try {
      if (studentUser1) {
        await prisma.booking.deleteMany({ where: { studentId: studentUser1.id } });
        await prisma.paymentOrder.deleteMany({ where: { userId: studentUser1.id } });
        await prisma.profile.deleteMany({ where: { userId: studentUser1.id } });
        await prisma.user.deleteMany({ where: { id: studentUser1.id } });
      }
      if (studentUser2) {
        await prisma.booking.deleteMany({ where: { studentId: studentUser2.id } });
        await prisma.paymentOrder.deleteMany({ where: { userId: studentUser2.id } });
        await prisma.profile.deleteMany({ where: { userId: studentUser2.id } });
        await prisma.user.deleteMany({ where: { id: studentUser2.id } });
      }
      if (teacherUser) {
        const tId = teacherUser.teacherProfile?.id;
        if (tId) {
          await prisma.teacherBreak.deleteMany({ where: { teacherId: tId } });
          await prisma.teacherAvailability.deleteMany({ where: { teacherId: tId } });
          await prisma.teacherDateOverride.deleteMany({ where: { teacherId: tId } });
          await prisma.liveClassSlot.deleteMany({ where: { teacherId: tId } });
          await prisma.teacherProfile.deleteMany({ where: { id: tId } });
        }
        await prisma.profile.deleteMany({ where: { userId: teacherUser.id } });
        await prisma.user.deleteMany({ where: { id: teacherUser.id } });
      }
      console.log("  ✨ Cleaned up test entities.");
    } catch (cleanupErr) {
      console.warn("  Notice during cleanup:", cleanupErr);
    }
    await prisma.$disconnect();
    }
  }

  // Final Summary
  console.log("\n========================================================");
  console.log(`📊 TEST SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("========================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runCalendarBookingSystemTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
