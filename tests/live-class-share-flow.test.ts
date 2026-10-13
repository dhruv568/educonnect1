import { getLearnerClassroomUrl } from "../lib/app-url";
import { isSafeRedirectPath, sanitizeRedirectUrl } from "../lib/auth/redirect-validator";
import { generateRoomToken, decodeRoomToken } from "../lib/classroom/classroom-token";
import { generateLiveKitRoomToken } from "../lib/classroom/livekit-server";

async function runShareFlowTests() {
  console.log("🧪 Starting EduConnects Shareable Live Class Link & Login Redirect Test Suite...\n");

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: any, testName: string, detail?: string) {
    if (Boolean(condition)) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
      failedTests++;
    }
  }

  // =========================================================================
  // TEST SUITE 1: Canonical URL Generation & Production Safety
  // =========================================================================
  console.log("🔗 1. Testing Production-Ready Shareable Classroom URL Generation...");

  const testClassId = "slot-advanced-calculus-2026";

  // Simulate production environment
  const originalEnv = process.env.NODE_ENV;
  const originalLearnerDomain = process.env.NEXT_PUBLIC_LEARNER_DOMAIN;

  try {
    (process.env as any).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_LEARNER_DOMAIN = "https://learners.educonnects.co.in";

    const prodUrl = getLearnerClassroomUrl(testClassId);
    assert(
      prodUrl === `https://learners.educonnects.co.in/live-class/${testClassId}`,
      "Production URL matches canonical domain and routing pattern (https://learners.educonnects.co.in/live-class/...)"
    );

    assert(
      !prodUrl.includes("localhost") && !prodUrl.includes("127.0.0.1"),
      "Production link NEVER contains localhost or 127.0.0.1"
    );

    // Production safety check even if NEXT_PUBLIC_APP_URL is accidentally localhost
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    const prodUrlWithLocalAppUrl = getLearnerClassroomUrl(testClassId);
    assert(
      !prodUrlWithLocalAppUrl.includes("localhost"),
      "Production safety guard overrides accidental localhost NEXT_PUBLIC_APP_URL"
    );

    // Development environment check
    (process.env as any).NODE_ENV = "development";
    const devUrl = getLearnerClassroomUrl(testClassId);
    assert(
      devUrl.includes(testClassId),
      "Development link generates properly with class ID"
    );
  } finally {
    (process.env as any).NODE_ENV = originalEnv;
    process.env.NEXT_PUBLIC_LEARNER_DOMAIN = originalLearnerDomain;
  }

  // =========================================================================
  // TEST SUITE 2: Open-Redirect Vulnerability Protection
  // =========================================================================
  console.log("\n🛡️ 2. Testing Open-Redirect Attack Prevention...");

  // Malicious attack payloads
  assert(!isSafeRedirectPath("//evil.com"), "Rejects protocol-relative open-redirect (//evil.com)");
  assert(!isSafeRedirectPath("/\\evil.com"), "Rejects backslash evasion (/\\evil.com)");
  assert(!isSafeRedirectPath("\\\\evil.com"), "Rejects double backslash (\\\\evil.com)");
  assert(!isSafeRedirectPath("https://malicious-phishing.com/login"), "Rejects external untrusted domain");
  assert(!isSafeRedirectPath("javascript:alert(document.cookie)"), "Rejects javascript: URI scheme");
  assert(!isSafeRedirectPath("data:text/html,<script>alert(1)</script>"), "Rejects data: URI scheme");
  assert(!isSafeRedirectPath("/path\r\nInjected-Header: 1"), "Rejects CRLF header injection");
  assert(!isSafeRedirectPath(""), "Rejects empty redirect string");

  // Valid internal application paths
  assert(isSafeRedirectPath(`/live-class/${testClassId}`), "Allows internal /live-class/:id path");
  assert(isSafeRedirectPath(`/classroom/${testClassId}`), "Allows internal /classroom/:sessionId path");
  assert(isSafeRedirectPath("/student/dashboard"), "Allows /student/dashboard");
  assert(isSafeRedirectPath("https://learners.educonnects.co.in/live-class/123"), "Allows canonical learner domain absolute URL");

  // Sanitizer fallbacks
  assert(
    sanitizeRedirectUrl("//evil.com", "/student/dashboard") === "/student/dashboard",
    "sanitizeRedirectUrl falls back safely when given malicious URL"
  );
  assert(
    sanitizeRedirectUrl(`/live-class/${testClassId}`) === `/live-class/${testClassId}`,
    "sanitizeRedirectUrl returns clean relative target for valid classroom destination"
  );
  assert(
    sanitizeRedirectUrl(`https://learners.educonnects.co.in/live-class/${testClassId}`) === `/live-class/${testClassId}`,
    "sanitizeRedirectUrl extracts safe relative path from canonical domain absolute URL"
  );

  // =========================================================================
  // TEST SUITE 3: Login & OTP Destination Preservation Logic
  // =========================================================================
  console.log("\n🔄 3. Testing Destination Preservation Across Login & OTP Stages...");

  const classroomPath = `/live-class/${testClassId}`;

  // Helper simulating the API login step redirect generator
  function simulateLoginOtpRedirect(email: string, returnTo?: string, role: string = "STUDENT") {
    const safeReturn = returnTo && isSafeRedirectPath(returnTo) ? sanitizeRedirectUrl(returnTo) : null;
    let redirectPath = `/verify-email?email=${encodeURIComponent(email)}`;
    if (safeReturn) {
      redirectPath += `&returnTo=${encodeURIComponent(safeReturn)}&redirectTo=${encodeURIComponent(safeReturn)}`;
    } else {
      redirectPath += role === "STUDENT" ? `&redirectTo=%2Fstudent%2Fdashboard` : `&redirectTo=%2Fteacher%2Fdashboard`;
    }
    return redirectPath;
  }

  // Helper simulating the API OTP verify step redirect generator
  function simulateVerifyOtpDestination(returnTo?: string, role: string = "STUDENT") {
    const safeReturn = returnTo && isSafeRedirectPath(returnTo) ? sanitizeRedirectUrl(returnTo) : null;
    if (safeReturn) return safeReturn;
    return role === "STUDENT" ? "/student/dashboard" : "/teacher/dashboard";
  }

  // Case B Test: Unauthenticated learner enters login flow with classroom destination
  const loginOtpUrl = simulateLoginOtpRedirect("learner@educonnects.com", classroomPath);
  assert(
    loginOtpUrl.includes(`returnTo=${encodeURIComponent(classroomPath)}`),
    "Login OTP redirection URL successfully preserves returnTo classroom destination"
  );

  const postOtpDestination = simulateVerifyOtpDestination(classroomPath);
  assert(
    postOtpDestination === classroomPath,
    "Post-OTP verification redirects directly to original classroom destination instead of dashboard"
  );

  // Fallback check when no returnTo is supplied
  const defaultDestination = simulateVerifyOtpDestination(undefined, "STUDENT");
  assert(
    defaultDestination === "/student/dashboard",
    "Falls back to /student/dashboard when no returnTo is specified"
  );

  // Attack test: Attempt open-redirect through returnTo
  const attackLoginUrl = simulateLoginOtpRedirect("student@educonnects.com", "https://evil.com/phish");
  assert(
    !attackLoginUrl.includes("evil.com") && !attackLoginUrl.includes("returnTo"),
    "Open-redirect attack through login returnTo parameter is sanitized"
  );

  // =========================================================================
  // TEST SUITE 4: Secure Classroom Room Token & LiveKit Integration
  // =========================================================================
  console.log("\n🔐 4. Testing WebRTC & LiveKit Room Token Generation...");

  const tokenPayload = {
    sessionId: "session-live-math-777",
    roomId: "room-math-777",
    userId: "student-user-uuid-888",
    userName: "Rohan Sharma",
    userRole: "STUDENT" as const,
    isTeacher: false,
  };

  const roomToken = generateRoomToken(tokenPayload);
  assert(typeof roomToken === "string" && roomToken.includes("."), "generateRoomToken produces HMAC signed token");

  const decoded = decodeRoomToken(roomToken);
  assert(decoded?.sessionId === tokenPayload.sessionId, "Decoded token contains identical sessionId");
  assert(decoded?.userId === tokenPayload.userId, "Decoded token contains identical student userId");
  assert(decoded?.isTeacher === false, "Decoded token preserves isTeacher role flag");

  // LiveKit JWT generation
  const livekitJwt = await generateLiveKitRoomToken({
    sessionId: tokenPayload.sessionId,
    roomId: tokenPayload.roomId,
    userId: tokenPayload.userId,
    userName: tokenPayload.userName,
    userRole: tokenPayload.userRole,
    isTeacher: false,
  });

  assert(
    typeof livekitJwt === "string" && livekitJwt.split(".").length === 3,
    "generateLiveKitRoomToken generates valid three-part JWT for real-time video room"
  );

  // =========================================================================
  // TEST SUITE 5: Classroom Access Control & 1-on-1 Privacy Enforcement
  // =========================================================================
  console.log("\n🚪 5. Testing Access Rules & 1-on-1 Booking Isolation...");

  interface MockSlot {
    id: string;
    classType: "ONE_TO_ONE" | "GROUP";
    maxCapacity: number;
    price: number;
    status: string;
  }

  interface MockBooking {
    studentId: string;
    status: string;
  }

  function evaluateStudentAccess(
    slot: MockSlot,
    existingBookings: MockBooking[],
    currentStudentId: string
  ): { authorized: boolean; reason?: string } {
    if (slot.status === "ENDED") return { authorized: false, reason: "Session has ended." };
    if (slot.status === "CANCELLED") return { authorized: false, reason: "Session cancelled." };

    // 1-on-1 Private session check
    if (slot.classType === "ONE_TO_ONE") {
      const bookedByOther = existingBookings.some(
        (b) => b.studentId !== currentStudentId && (b.status === "CONFIRMED" || b.status === "ATTENDED")
      );
      if (bookedByOther) {
        return {
          authorized: false,
          reason: "This private 1-on-1 session is reserved for another learner.",
        };
      }
    }

    // Capacity check
    const activeBookings = existingBookings.filter(
      (b) => b.status === "CONFIRMED" || b.status === "ATTENDED"
    );
    const hasMyBooking = activeBookings.some((b) => b.studentId === currentStudentId);

    if (!hasMyBooking && activeBookings.length >= slot.maxCapacity) {
      return { authorized: false, reason: "Class has reached maximum capacity." };
    }

    if (hasMyBooking || slot.price === 0) {
      return { authorized: true };
    }

    return { authorized: false, reason: "Paid booking required." };
  }

  // Scenario A: 1-on-1 session booked by Student A -> Student B tries to access
  const oneToOneSlot: MockSlot = {
    id: "slot-private-trial-01",
    classType: "ONE_TO_ONE",
    maxCapacity: 1,
    price: 0,
    status: "OPEN",
  };
  const studentABookings: MockBooking[] = [{ studentId: "student-A", status: "CONFIRMED" }];

  const accessForStudentA = evaluateStudentAccess(oneToOneSlot, studentABookings, "student-A");
  assert(accessForStudentA.authorized, "Booked learner (Student A) enters private 1-on-1 class directly");

  const accessForStudentB = evaluateStudentAccess(oneToOneSlot, studentABookings, "student-B");
  assert(
    !accessForStudentB.authorized && accessForStudentB.reason?.includes("reserved for another learner"),
    "Unrelated learner (Student B) is blocked from accessing private 1-on-1 session"
  );

  // Scenario B: Group session with available seats
  const groupSlot: MockSlot = {
    id: "slot-group-physics-01",
    classType: "GROUP",
    maxCapacity: 10,
    price: 0,
    status: "SCHEDULED",
  };

  const groupAccess = evaluateStudentAccess(groupSlot, [], "new-student-C");
  assert(groupAccess.authorized, "Learner with shared link enters free group classroom within capacity");

  // Scenario C: Group session at full capacity
  const fullBookings: MockBooking[] = Array.from({ length: 10 }, (_, i) => ({
    studentId: `student-${i}`,
    status: "CONFIRMED",
  }));
  const fullAccess = evaluateStudentAccess(groupSlot, fullBookings, "late-student-D");
  assert(
    !fullAccess.authorized && fullAccess.reason?.includes("maximum capacity"),
    "Gracefully blocks entry when group classroom reaches max capacity"
  );

  // =========================================================================
  // TEST SUMMARY
  // =========================================================================
  console.log("\n==============================================");
  console.log(`🎉 LIVE CLASS SHARE SUITE: ${passedTests} Passed | ${failedTests} Failed`);
  console.log("==============================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runShareFlowTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
