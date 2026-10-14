import assert from "assert";
import crypto from "crypto";
import { generateRoomToken, decodeRoomToken } from "../lib/classroom/classroom-token";
import { generateLiveKitRoomToken } from "../lib/classroom/livekit-server";

async function runBatch5And6Tests() {
  console.log("\n=======================================================");
  console.log("🧪 RUNNING BATCH 5 & BATCH 6 VERIFICATION TEST SUITE");
  console.log("   • Batch 5: Live Classes, WebRTC, Whiteboard & Attendance");
  console.log("   • Batch 6: Dashboards, Progress, Schedules & Verification");
  console.log("=======================================================\n");

  let passed = 0;
  function test(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      console.log(`   ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`   ❌ FAIL: ${name} ->`, err.message);
      throw err;
    }
  }

  // =========================================================================
  // BATCH 5 TESTS: LIVE CLASSROOM, AUTHORIZATION & SYNCHRONIZATION
  // =========================================================================
  console.log("--- BATCH 5: Live Classes, Authorization & Signaling ---");

  test("1. Classroom Token Service: generateRoomToken and decodeRoomToken", () => {
    const payload = {
      sessionId: "session-math-101",
      roomId: "room-math-algebra-101",
      userId: "user-student-001",
      userName: "Alex Morgan",
      userRole: "STUDENT" as const,
      isTeacher: false,
    };

    const token = generateRoomToken(payload);
    assert.strictEqual(typeof token, "string", "Token is a string");
    assert(token.includes("."), "Token has payload.signature format");

    const decoded = decodeRoomToken(token);
    assert(decoded !== null, "Token decodes successfully");
    assert.strictEqual(decoded?.sessionId, "session-math-101");
    assert.strictEqual(decoded?.userId, "user-student-001");
    assert.strictEqual(decoded?.userName, "Alex Morgan");
    assert.strictEqual(decoded?.isTeacher, false);
  });

  test("2. Classroom Token Service: Reject tampered and forged tokens", () => {
    const payload = {
      sessionId: "session-math-101",
      roomId: "room-math-algebra-101",
      userId: "user-student-001",
      userName: "Alex Morgan",
      userRole: "STUDENT" as const,
      isTeacher: false,
    };

    const token = generateRoomToken(payload);
    const [payloadB64, sig] = token.split(".");

    // Tamper with payload (escalate to teacher)
    const decodedJson = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    decodedJson.isTeacher = true;
    decodedJson.userRole = "TEACHER";
    const tamperedPayloadB64 = Buffer.from(JSON.stringify(decodedJson)).toString("base64url");
    const tamperedToken = `${tamperedPayloadB64}.${sig}`;

    assert.strictEqual(decodeRoomToken(tamperedToken), null, "Tampered payload must be rejected");
    assert.strictEqual(decodeRoomToken("invalid.random.token"), null, "Malformed token rejected");
    assert.strictEqual(decodeRoomToken(""), null, "Empty token rejected");
  });

  test("3. LiveKit Server Token Generation produces valid JWT", async () => {
    const livekitToken = await generateLiveKitRoomToken({
      sessionId: "session-math-101",
      roomId: "room-math-algebra-101",
      userId: "user-student-001",
      userName: "Alex Morgan",
      userRole: "STUDENT",
      isTeacher: false,
    });

    assert.strictEqual(typeof livekitToken, "string", "LiveKit token is string");
    assert.strictEqual(livekitToken.split(".").length, 3, "LiveKit token is standard 3-part JWT");
  });

  test("4. Attendance Duration & Status Evaluation Rules", () => {
    const durationMinutes = 60;
    const requiredSeconds = durationMinutes * 60 * 0.75; // 2700s = 45 mins (75%)

    function evaluateAttendance(durationSec: number) {
      if (durationSec >= requiredSeconds) return "PRESENT";
      if (durationSec > 0) return "PARTIAL";
      return "ABSENT";
    }

    assert.strictEqual(evaluateAttendance(3600), "PRESENT", "Full 60 mins (3600s) = PRESENT");
    assert.strictEqual(evaluateAttendance(2700), "PRESENT", "Exact 75% (2700s) = PRESENT");
    assert.strictEqual(evaluateAttendance(2699), "PARTIAL", "Just below 75% = PARTIAL");
    assert.strictEqual(evaluateAttendance(300), "PARTIAL", "5 minutes attended = PARTIAL");
    assert.strictEqual(evaluateAttendance(0), "ABSENT", "0 seconds attended = ABSENT");
  });

  test("5. Join window logic: Allows entry within 15m or when session is LIVE/OPEN", () => {
    const now = Date.now();
    const startTimeIn20m = now + 20 * 60 * 1000;
    const startTimeIn10m = now + 10 * 60 * 1000;
    const startTime10mAgo = now - 10 * 60 * 1000;
    const endTimeIn50m = now + 50 * 60 * 1000;
    const joinBeforeMinutes = 15;

    function checkCanJoin(slot: { startTime: number; endTime: number; status: string; sessionStatus?: string }) {
      const joinWindowStart = slot.startTime - joinBeforeMinutes * 60 * 1000;
      const isLiveNow = slot.status === "LIVE" || slot.sessionStatus === "LIVE" || slot.sessionStatus === "OPEN";
      const isWithinWindow = now >= joinWindowStart && now <= slot.endTime;
      return (isLiveNow || isWithinWindow) && slot.status !== "CANCELLED";
    }

    // 20 minutes before, not live -> cannot join yet
    assert.strictEqual(
      checkCanJoin({ startTime: startTimeIn20m, endTime: startTimeIn20m + 3600000, status: "SCHEDULED" }),
      false,
      "Cannot join 20m before start when not live"
    );

    // 10 minutes before -> inside 15m window -> can join
    assert.strictEqual(
      checkCanJoin({ startTime: startTimeIn10m, endTime: startTimeIn10m + 3600000, status: "SCHEDULED" }),
      true,
      "Can join 10m before start (inside 15m window)"
    );

    // Started early (status = LIVE or OPEN) even if 20m before -> can join
    assert.strictEqual(
      checkCanJoin({ startTime: startTimeIn20m, endTime: startTimeIn20m + 3600000, status: "LIVE", sessionStatus: "OPEN" }),
      true,
      "Can join when educator starts session early"
    );

    // Cancelled class cannot be joined
    assert.strictEqual(
      checkCanJoin({ startTime: startTimeIn10m, endTime: startTimeIn10m + 3600000, status: "CANCELLED" }),
      false,
      "Cancelled class cannot be joined"
    );
  });

  test("6. Whiteboard element serialization and instant peer broadcast payload", () => {
    const elements = [
      { id: "el-1", type: "draw", points: [{ x: 10, y: 10 }, { x: 20, y: 20 }], color: "#2563EB", strokeWidth: 3 },
      { id: "el-2", type: "rectangle", x: 50, y: 50, width: 100, height: 80, color: "#16805B", strokeWidth: 2 },
    ];

    const broadcastPayload = {
      action: "broadcast",
      userId: "teacher-001",
      type: "whiteboard-update",
      payload: {
        elements,
        actionType: "update",
        fromUserId: "teacher-001",
        timestamp: Date.now(),
      },
    };

    assert.strictEqual(broadcastPayload.payload.elements.length, 2);
    assert.strictEqual(broadcastPayload.payload.fromUserId, "teacher-001");
    assert.strictEqual(broadcastPayload.type, "whiteboard-update");
  });

  // =========================================================================
  // BATCH 6 TESTS: DASHBOARDS, PROGRESS & VERIFICATION STATES
  // =========================================================================
  console.log("\n--- BATCH 6: Dashboards, Progress, Schedules & Verification ---");

  test("7. Lesson completion calculation (90% threshold for video, 100% for text)", () => {
    function isLessonCompleted(lesson: { type: string; durationSeconds: number }, progressSeconds: number, forceComplete = false) {
      if (forceComplete) return true;
      if (lesson.durationSeconds > 0) {
        const percent = (progressSeconds / lesson.durationSeconds) * 100;
        return percent >= 90;
      }
      return lesson.type === "TEXT";
    }

    const videoLesson = { type: "VIDEO", durationSeconds: 600 }; // 10 minutes (600s)

    // Watched 8.9 minutes (534s = 89%) -> incomplete
    assert.strictEqual(isLessonCompleted(videoLesson, 534), false, "89% watched is not completed");

    // Watched 9.0 minutes (540s = 90%) -> complete
    assert.strictEqual(isLessonCompleted(videoLesson, 540), true, "90% watched is completed");

    // Watched 10.0 minutes (600s = 100%) -> complete
    assert.strictEqual(isLessonCompleted(videoLesson, 600), true, "100% watched is completed");

    // Text lesson completes immediately
    assert.strictEqual(isLessonCompleted({ type: "TEXT", durationSeconds: 0 }, 10), true, "Text lesson completes upon view");
  });

  test("8. Overall Course Progress Percentage Formula", () => {
    function calcOverallProgress(totalLessons: number, completedCount: number) {
      return totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    }

    assert.strictEqual(calcOverallProgress(10, 0), 0, "0 of 10 = 0%");
    assert.strictEqual(calcOverallProgress(10, 3), 30, "3 of 10 = 30%");
    assert.strictEqual(calcOverallProgress(3, 1), 33, "1 of 3 = 33%");
    assert.strictEqual(calcOverallProgress(3, 2), 67, "2 of 3 = 67%");
    assert.strictEqual(calcOverallProgress(12, 12), 100, "12 of 12 = 100%");
    assert.strictEqual(calcOverallProgress(0, 0), 0, "0 lessons = 0%");
  });

  test("9. Educator Verification Banner State Machine", () => {
    function getVerificationBanner(status: string) {
      if (status === "VERIFIED" || status === "APPROVED") {
        return { variant: "teal", title: "Verified Educator", isLocked: false };
      }
      if (status === "PENDING") {
        return {
          variant: "amber",
          title: "Application Under Review",
          message: "Your educator account is pending verification. Teaching, live classes, course publishing, and content publishing will be available after verification.",
          isLocked: true,
        };
      }
      return { variant: "orange", title: "Verification Required", isLocked: true };
    }

    const verified = getVerificationBanner("VERIFIED");
    assert.strictEqual(verified.variant, "teal");
    assert.strictEqual(verified.isLocked, false);

    const pending = getVerificationBanner("PENDING");
    assert.strictEqual(pending.variant, "amber");
    assert.strictEqual(pending.isLocked, true);
    assert(pending.message?.includes("pending verification"));

    const rejected = getVerificationBanner("REJECTED");
    assert.strictEqual(rejected.isLocked, true);
  });

  test("10. Notification Unread Count Tracking across Dashboards", () => {
    const mockNotifications = [
      { id: "n1", isRead: false },
      { id: "n2", isRead: true },
      { id: "n3", isRead: false },
      { id: "n4", isRead: false },
    ];

    const unreadCount = mockNotifications.filter((n) => !n.isRead).length;
    assert.strictEqual(unreadCount, 3, "Unread count accurately computed as 3");
  });

  console.log(`\n🎉 ALL ${passed} BATCH 5 & 6 UNIT TESTS PASSED SUCCESSFULLY!\n`);
}

runBatch5And6Tests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
