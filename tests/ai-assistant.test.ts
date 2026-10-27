import assert from "node:assert";
import {
  checkRateLimit,
  validateAiMessage,
  MAX_MESSAGE_LENGTH,
} from "../lib/ai/rate-limiter";
import {
  isAiAssistantExcluded,
  getSectionTheme,
  QUICK_QUESTIONS,
  THEMES,
} from "../lib/ai/assistant-config";
import {
  processAiChat,
  sanitizeContent,
  AssistantRole,
} from "../services/ai-service";

async function runTests() {
  console.log("🚀 Starting Upgraded EduConnects AI Assistant Test Suite...\n");

  // =========================================================================
  // TEST 1: Message Validation (Empty, Whitespace, Non-String, Length)
  // =========================================================================
  console.log("TEST 1: Message Validation");
  {
    const emptyResult = validateAiMessage("");
    assert.strictEqual(emptyResult.valid, false, "Empty string should be invalid");

    const whitespaceResult = validateAiMessage("   \n  \t  ");
    assert.strictEqual(whitespaceResult.valid, false, "Whitespace-only should be invalid");

    const nonStringResult = validateAiMessage(12345 as any);
    assert.strictEqual(nonStringResult.valid, false, "Non-string should be invalid");

    const tooLongString = "a".repeat(MAX_MESSAGE_LENGTH + 1);
    const tooLongResult = validateAiMessage(tooLongString);
    assert.strictEqual(tooLongResult.valid, false, "Message > 1000 chars should be invalid");

    const validResult = validateAiMessage("How do live classes work?");
    assert.strictEqual(validResult.valid, true, "Normal message should be valid");
    assert.strictEqual(validResult.message, "How do live classes work?");
    console.log("  ✔ Message validation passed (empty, whitespace, length checks)");
  }

  // =========================================================================
  // TEST 2: Rate Limiting Enforcement
  // =========================================================================
  console.log("\nTEST 2: Rate Limiting");
  {
    const testKey = `test-ip-${Date.now()}`;
    for (let i = 0; i < 15; i++) {
      const res = checkRateLimit(testKey, 15, 60000);
      assert.strictEqual(res.allowed, true, `Request ${i + 1} should be allowed`);
    }

    const exceededRes = checkRateLimit(testKey, 15, 60000);
    assert.strictEqual(exceededRes.allowed, false, "16th request must be rate-limited");
    assert.strictEqual(exceededRes.remaining, 0, "Remaining requests should be 0");
    assert.ok(exceededRes.resetInSeconds > 0, "Reset seconds should be positive");
    console.log("  ✔ Rate limiting enforcement passed (15 req/min cap)");
  }

  // =========================================================================
  // TEST 3: Sensitive Data Sanitization
  // =========================================================================
  console.log("\nTEST 3: Sensitive Data Sanitization");
  {
    const sanitized = sanitizeContent(
      "My OTP is 849201, password: Secret1234, card 4111 2222 3333 4444, Aadhaar 123456789012"
    );
    assert.ok(!sanitized.includes("849201"), "OTP must be redacted");
    assert.ok(!sanitized.includes("Secret1234"), "Password must be redacted");
    assert.ok(!sanitized.includes("4111 2222 3333 4444"), "Card number must be redacted");
    assert.ok(!sanitized.includes("123456789012"), "Aadhaar must be redacted");
    console.log("  ✔ Sensitive data scrubbing passed");
  }

  // =========================================================================
  // TEST 4: Route Exclusion Logic
  // =========================================================================
  console.log("\nTEST 4: Route Exclusion Logic");
  {
    const excludedRoutes = [
      "/classroom/session-abc-123",
      "/classroom",
      "/payment/checkout",
      "/payment/checkout/process",
      "/login",
      "/register",
      "/register/student",
      "/register/teacher",
      "/student/login",
      "/student/register",
      "/teacher/login",
      "/teacher/register",
      "/admin/login",
      "/staff/login",
      "/staff/register",
      "/verify-otp",
      "/verify-email",
      "/forgot-password",
      "/reset-password",
    ];

    for (const route of excludedRoutes) {
      assert.strictEqual(
        isAiAssistantExcluded(route),
        true,
        `Route ${route} should be EXCLUDED from AI assistant`
      );
    }

    const allowedRoutes = [
      "/",
      "/courses",
      "/courses/react-mastery",
      "/find-teachers",
      "/find-teachers/prof-smith",
      "/how-it-works",
      "/about",
      "/contact",
      "/student",
      "/student/dashboard",
      "/student/courses",
      "/student/live-classes",
      "/teacher",
      "/teacher/dashboard",
      "/teacher/courses",
      "/teacher/live-classes",
      "/teacher/verification",
      "/admin",
      "/admin/dashboard",
      "/admin/verification",
      "/admin/users",
    ];

    for (const route of allowedRoutes) {
      assert.strictEqual(
        isAiAssistantExcluded(route),
        false,
        `Route ${route} should be ALLOWED for AI assistant`
      );
    }
    console.log("  ✔ Route exclusion checks passed");
  }

  // =========================================================================
  // TEST 5: Section Themes Mapping
  // =========================================================================
  console.log("\nTEST 5: Section Themes Mapping");
  {
    assert.strictEqual(getSectionTheme("/", "guest"), "home");
    assert.strictEqual(getSectionTheme("/courses", "guest"), "learner");
    assert.strictEqual(getSectionTheme("/student/dashboard", "LEARNER"), "learner");
    assert.strictEqual(getSectionTheme("/teacher/dashboard", "EDUCATOR"), "educator");
    assert.strictEqual(getSectionTheme("/admin/dashboard", "ADMIN"), "admin");

    assert.ok(THEMES.home.headerBg.includes("#16805B") || THEMES.home.headerBg.includes("#0D5C41"), "Home theme must use emerald green");
    assert.ok(THEMES.learner.headerBg.includes("#2563EB") || THEMES.learner.headerBg.includes("#1D4ED8"), "Learner theme must use blue");
    assert.ok(THEMES.educator.headerBg.includes("#0F766E") || THEMES.educator.headerBg.includes("#115E59"), "Educator theme must use teal");
    assert.ok(THEMES.admin.headerBg.includes("#073F3C"), "Admin theme must use admin dark teal");
    console.log("  ✔ Section theme mapping passed");
  }

  // =========================================================================
  // TEST 6: EduConnects Free-Text Questions
  // =========================================================================
  console.log("\nTEST 6: EduConnects Free-Text Questions");
  {
    // 6a: Find an educator
    const findEducatorRes = await processAiChat({
      message: "How do I find an educator?",
      role: "LEARNER",
    });
    assert.ok(findEducatorRes.response.length > 20, "Find educator response should not be empty");
    assert.ok(
      findEducatorRes.response.includes("/find-teachers"),
      "Response should direct to /find-teachers"
    );

    // 6b: Live classes
    const liveClassesRes = await processAiChat({
      message: "Explain how live classes work.",
      role: "LEARNER",
    });
    assert.ok(liveClassesRes.response.length > 20, "Live classes response should not be empty");
    assert.ok(
      liveClassesRes.response.toLowerCase().includes("live") ||
        liveClassesRes.response.toLowerCase().includes("classroom"),
      "Response should explain live classroom functionality"
    );

    // 6c: Forgot password
    const forgotPwdRes = await processAiChat({
      message: "I forgot my password, what should I do?",
      role: "guest",
    });
    assert.ok(forgotPwdRes.response.length > 20, "Forgot password response should not be empty");
    assert.ok(
      forgotPwdRes.response.toLowerCase().includes("forgot") ||
        forgotPwdRes.response.toLowerCase().includes("reset"),
      "Response should provide password reset guidance"
    );

    // 6d: What courses are available
    const coursesRes = await processAiChat({
      message: "What courses are available?",
      role: "guest",
    });
    assert.ok(coursesRes.response.length > 20, "Courses response should not be empty");
    assert.ok(
      coursesRes.response.includes("/courses"),
      "Response should direct to /courses"
    );

    console.log("  ✔ EduConnects free-text questions passed (educator, live classes, password, courses)");
  }

  // =========================================================================
  // TEST 7: General Knowledge Questions (Physics, AI/ML, Email Drafting)
  // =========================================================================
  console.log("\nTEST 7: General Knowledge Questions (Must not refuse)");
  {
    // 7a: Physics question
    const physicsRes = await processAiChat({
      message: "Tell me something interesting about physics.",
      role: "guest",
    });
    assert.ok(physicsRes.response.length > 30, "Physics response should not be empty");
    assert.ok(
      !physicsRes.response.includes("I can only answer predefined questions"),
      "Must NOT refuse physics question"
    );
    assert.ok(
      physicsRes.response.toLowerCase().includes("time") ||
        physicsRes.response.toLowerCase().includes("einstein") ||
        physicsRes.response.toLowerCase().includes("relativity") ||
        physicsRes.response.toLowerCase().includes("quantum"),
      "Must provide interesting physics content"
    );

    // 7b: AI vs Machine Learning
    const aiMlRes = await processAiChat({
      message: "What is the difference between AI and machine learning?",
      role: "LEARNER",
    });
    assert.ok(aiMlRes.response.length > 30, "AI/ML response should not be empty");
    assert.ok(
      aiMlRes.response.toLowerCase().includes("intelligence") &&
        aiMlRes.response.toLowerCase().includes("machine learning"),
      "Must explain difference between AI and Machine Learning"
    );

    // 7c: Draft an email to educator
    const emailRes = await processAiChat({
      message: "Write an email to my educator.",
      role: "LEARNER",
    });
    assert.ok(emailRes.response.length > 30, "Email draft response should not be empty");
    assert.ok(
      emailRes.response.toLowerCase().includes("subject") ||
        emailRes.response.toLowerCase().includes("dear"),
      "Must provide an email template"
    );

    console.log("  ✔ General knowledge questions passed (Physics, AI/ML, Email Drafting)");
  }

  // =========================================================================
  // TEST 8: Hinglish User Input
  // =========================================================================
  console.log("\nTEST 8: Hinglish Language Support");
  {
    const hinglishEducatorRes = await processAiChat({
      message: "Educator kaise find kare?",
      role: "guest",
    });
    assert.ok(hinglishEducatorRes.response.length > 20, "Hinglish response should not be empty");
    assert.ok(
      hinglishEducatorRes.response.includes("/find-teachers") ||
        hinglishEducatorRes.response.toLowerCase().includes("educator"),
      "Hinglish educator query should direct to educators"
    );

    const hinglishLiveRes = await processAiChat({
      message: "Live class kaise join kare?",
      role: "LEARNER",
    });
    assert.ok(hinglishLiveRes.response.length > 20, "Hinglish live response should not be empty");
    assert.ok(
      hinglishLiveRes.response.toLowerCase().includes("live class") ||
        hinglishLiveRes.response.toLowerCase().includes("join"),
      "Hinglish live class query should explain joining"
    );

    console.log("  ✔ Hinglish language support passed");
  }

  // =========================================================================
  // TEST 9: Multi-Turn Conversation Context & Follow-Up Questions
  // =========================================================================
  console.log("\nTEST 9: Multi-Turn Conversation Context & Follow-Up Questions");
  {
    // Step 1: User asks about live classes
    const turn1 = await processAiChat({
      message: "How do live classes work?",
      role: "LEARNER",
    });
    const conversationId = turn1.conversationId;
    assert.ok(conversationId, "Conversation ID must be generated");

    // Step 2: User asks follow-up: "Can I join one?"
    // The assistant should understand that "one" refers to a live class.
    const turn2 = await processAiChat({
      conversationId,
      message: "Can I join one?",
      role: "LEARNER",
      history: [
        { role: "user", content: "How do live classes work?" },
        { role: "assistant", content: turn1.response },
      ],
    });
    assert.ok(turn2.response.length > 20, "Follow-up response should not be empty");
    assert.ok(
      turn2.response.toLowerCase().includes("live class") ||
        turn2.response.toLowerCase().includes("join"),
      "Assistant must understand 'one' refers to a live class"
    );

    // Step 3: User asks follow-up: "What about payment?"
    const turn3 = await processAiChat({
      conversationId,
      message: "What about payment?",
      role: "LEARNER",
      history: [
        { role: "user", content: "How do live classes work?" },
        { role: "assistant", content: turn1.response },
        { role: "user", content: "Can I join one?" },
        { role: "assistant", content: turn2.response },
      ],
    });
    assert.ok(turn3.response.length > 20, "Payment follow-up response should not be empty");
    assert.ok(
      turn3.response.toLowerCase().includes("inr") ||
        turn3.response.toLowerCase().includes("₹") ||
        turn3.response.toLowerCase().includes("cashfree") ||
        turn3.response.toLowerCase().includes("rate") ||
        turn3.response.toLowerCase().includes("trial"),
      "Assistant must explain payment in context of live classes"
    );

    // Step 4: User asks follow-up: "Can you explain this in simple language?"
    const turn4 = await processAiChat({
      conversationId,
      message: "Can you explain this in simple language?",
      role: "LEARNER",
      history: [
        { role: "user", content: "How do live classes work?" },
        { role: "assistant", content: turn1.response },
      ],
    });
    assert.ok(turn4.response.length > 20, "Simplified explanation should not be empty");
    assert.ok(
      turn4.response.toLowerCase().includes("simple") ||
        turn4.response.toLowerCase().includes("video call") ||
        turn4.response.toLowerCase().includes("tutor"),
      "Assistant must provide simplified explanation with analogies"
    );

    console.log("  ✔ Multi-turn context and follow-up understanding passed");
  }

  // =========================================================================
  // TEST 10: Long but Valid User Question
  // =========================================================================
  console.log("\nTEST 10: Long but Valid User Question");
  {
    const longQuestion =
      "Hello, I am a software engineering student looking to learn full-stack web development with React, Node.js, and TypeScript. I want to know if EduConnects offers live classes where I can interact with the instructor directly to review my project code, as well as recorded lessons that I can review at night after my university classes. Can you explain how this works and what I should look for when choosing an educator?";

    assert.ok(longQuestion.length > 300, "Question should be long (>300 chars)");
    assert.ok(longQuestion.length <= MAX_MESSAGE_LENGTH, "Question must be within limit");

    const longRes = await processAiChat({
      message: longQuestion,
      role: "LEARNER",
    });
    assert.ok(longRes.response.length > 30, "Long question response should not be empty");
    console.log("  ✔ Long valid question handling passed (350+ chars)");
  }

  // =========================================================================
  // TEST 11: Arbitrary / Unrecognized Question (Never refuse or show rigid menu)
  // =========================================================================
  console.log("\nTEST 11: Arbitrary / Unrecognized Question");
  {
    const arbitraryRes = await processAiChat({
      message: "Can I learn Spanish guitar at 2 AM on EduConnects?",
      role: "guest",
    });
    assert.ok(arbitraryRes.response.length > 20, "Arbitrary response should not be empty");
    assert.ok(
      !arbitraryRes.response.includes("I can only answer predefined questions"),
      "Must not refuse arbitrary input"
    );
    assert.ok(
      !arbitraryRes.response.includes("Please choose one of these options"),
      "Must not force user into hardcoded options"
    );
    console.log("  ✔ Arbitrary question handled gracefully without refusal or rigid menu");
  }

  // =========================================================================
  // TEST 12: CORE REQUIREMENT — Question NOT in Any Predefined Quick Questions
  // =========================================================================
  console.log("\nTEST 12: Core Verification — Question NOT in Any Quick-Question List");
  {
    const allQuickQuestions = [
      ...QUICK_QUESTIONS.LEARNER,
      ...QUICK_QUESTIONS.EDUCATOR,
      ...QUICK_QUESTIONS.ADMIN,
      ...QUICK_QUESTIONS.guest,
    ];

    const unlistedQuestions = [
      "Tell me something interesting about physics.",
      "What is the difference between AI and machine learning?",
      "Write an email to my educator.",
      "Can you explain this in simple language?",
      "I forgot my password, what should I do?",
      "Can I learn Spanish guitar at 2 AM on EduConnects?",
    ];

    for (const q of unlistedQuestions) {
      assert.strictEqual(
        allQuickQuestions.includes(q),
        false,
        `Question "${q}" must NOT be in predefined quick-question lists`
      );

      const res = await processAiChat({
        message: q,
        role: "guest",
      });
      assert.ok(
        res.response.length > 20,
        `AI must generate a non-empty response for unlisted question "${q}"`
      );
      assert.ok(
        !res.response.includes("I can only answer these questions"),
        `AI must not reject unlisted question "${q}"`
      );
    }

    console.log(
      "  ✔ Core Requirement Verified: Unlisted questions successfully processed with useful AI responses!"
    );
  }

  // =========================================================================
  // TEST 13: Official Company and Legal Information Verification
  // =========================================================================
  // TEST 13: Official Company and Legal Information
  // =========================================================================
  console.log("\nTEST 13: Official Company and Legal Information");
  {
    const legalQueries = [
      "What is your company information?",
      "Can you give me your legal entity name and CIN?",
      "Where is your registered office address?",
    ];

    for (const q of legalQueries) {
      const res = await processAiChat({
        message: q,
        role: "guest",
      });

      assert.ok(
        res.response.includes("Shrivastava ProFunnels Ventures Pvt Ltd"),
        `Response for "${q}" must include legal name 'Shrivastava ProFunnels Ventures Pvt Ltd'`
      );
      assert.ok(
        res.response.includes("U85499UP2024PTC212061"),
        `Response for "${q}" must include CIN 'U85499UP2024PTC212061'`
      );
      assert.ok(
        res.response.includes("Ward No. 8, Basundhara Colony, Chandmari, Lalitpur (UP), 284403"),
        `Response for "${q}" must include registered office address 'Ward No. 8, Basundhara Colony, Chandmari, Lalitpur (UP), 284403'`
      );
    }
    console.log("  ✔ Official Company Information, CIN, and Registered Office strictly verified!");
  }

  // =========================================================================
  // TEST 14: Owner / Founder / Creator Knowledge Verification across All Portals & Roles
  // =========================================================================
  console.log("\nTEST 14: Owner / Founder / Creator Knowledge Verification across All Portals & Roles");
  {
    const roles: AssistantRole[] = ["guest", "LEARNER", "EDUCATOR", "ADMIN"];
    const ownerQueries = [
      "Who owns EduConnects?",
      "Who is the owner of EduConnects?",
      "Who is the founder of EduConnects?",
      "Who is the creator of EduConnects?",
    ];

    const expectedExactAnswer =
      "EduConnects is founded and owned by Neeraj Shrivastava. EduConnects operates under Shrivastava ProFunnels Ventures Pvt Ltd.";

    for (const role of roles) {
      for (const q of ownerQueries) {
        const res = await processAiChat({
          message: q,
          role,
        });

        assert.strictEqual(
          res.response.trim(),
          expectedExactAnswer,
          `Query "${q}" for role "${role}" must return exact specified answer!`
        );
      }

      // Test request for more details about the owner/founder
      const detailRes = await processAiChat({
        message: "Tell me more details about the founder Neeraj Shrivastava",
        role,
      });

      assert.ok(
        detailRes.response.includes("EduConnects is founded and owned by Neeraj Shrivastava. EduConnects operates under Shrivastava ProFunnels Ventures Pvt Ltd."),
        `Detailed query for role "${role}" must start with exact answer`
      );
      assert.ok(
        detailRes.response.includes("B.Sc. in Mathematics") && detailRes.response.includes("M.Sc. in Computer Science"),
        `Detailed query for role "${role}" must include approved About Us details`
      );
    }

    console.log("  ✔ Owner / Founder / Creator knowledge verified with 100% exact response consistency across Main, Learner, Educator, and Admin portals!");
  }

  console.log("\n✨ All 14 EduConnects AI Assistant Tests Passed Successfully! 🎉\n");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ AI Assistant Test Suite Failed:", err);
  process.exit(1);
});
