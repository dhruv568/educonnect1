import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { MAX_HISTORY_MESSAGES } from "@/lib/ai/rate-limiter";
import { OFFICIAL_COMPANY_INFO } from "@/lib/company";

export type AssistantRole = "ADMIN" | "EDUCATOR" | "LEARNER" | "guest";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AiChatOptions {
  message: string;
  conversationId?: string;
  userId?: string;
  role: AssistantRole;
  userEmail?: string;
  userName?: string;
  history?: ChatMessage[];
}

export interface AiChatResult {
  response: string;
  conversationId: string;
  role: AssistantRole;
  isFallback?: boolean;
}

const DEFAULT_MODEL = "gpt-4o-mini";
const TEMPORARY_UNAVAILABLE_MESSAGE =
  "Sorry, the EduConnects Assistant is temporarily unavailable. Please try again in a moment.";

/**
 * In-memory conversation store for active chat sessions.
 * Guarantees reliable session conversation history across multiple turns
 * even when offline or before database synchronisation.
 */
interface ConversationRecord {
  id: string;
  role: AssistantRole;
  userId?: string;
  messages: ChatMessage[];
  updatedAt: number;
}

const conversationStore = new Map<string, ConversationRecord>();

// Clean up conversations older than 24 hours
if (typeof setInterval !== "undefined") {
  const storeTimer = setInterval(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    for (const [id, record] of conversationStore.entries()) {
      if (record.updatedAt < oneDayAgo) {
        conversationStore.delete(id);
      }
    }
  }, 10 * 60 * 1000);
  if (storeTimer && typeof storeTimer.unref === "function") {
    storeTimer.unref();
  }
}

export function getStoredConversation(id: string): ConversationRecord | undefined {
  return conversationStore.get(id);
}

/**
 * Extract text response from OpenAI Responses API or Chat Completions API
 */
function extractResponseText(res: any): string {
  if (!res) return "";
  if (typeof res === "string") return res;

  // Check OpenAI Responses API output structure
  if (Array.isArray(res.output)) {
    const textParts: string[] = [];
    for (const item of res.output) {
      if (item.type === "message" && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c.type === "output_text" && c.text) {
            textParts.push(c.text);
          }
        }
      }
    }
    if (textParts.length > 0) return textParts.join("\n").trim();
  }

  // Check OpenAI Chat Completions choices structure
  if (Array.isArray(res.choices) && res.choices.length > 0) {
    const content = res.choices[0]?.message?.content;
    if (typeof content === "string") return content.trim();
  }

  return "";
}

/**
 * Filter out sensitive patterns like passwords, OTPs, Aadhaar, bank numbers, credit cards, bearer tokens
 */
export function sanitizeContent(text: string): string {
  if (!text) return "";
  return text
    .replace(/\b\d{6}\b/g, "[REDACTED_OTP]") // 6-digit OTPs
    .replace(/\b\d{12}\b/g, "[REDACTED_AADHAAR]") // 12-digit Aadhaar
    .replace(/\b[A-Z]{4}0[A-Z0-9]{6}\b/gi, "[REDACTED_IFSC]") // IFSC code
    .replace(/\b(?:\d[ -]*?){13,16}\b/g, "[REDACTED_CARD]") // 13-16 digit payment cards
    .replace(/\b(?:cvv|cvc)\s*[:=]?\s*\d{3,4}\b/gi, "CVV: [REDACTED]") // CVV
    .replace(/\b(?:sk-[a-zA-Z0-9]{20,}|bearer\s+[a-zA-Z0-9_.-]+)\b/gi, "[REDACTED_TOKEN]") // API keys & tokens
    .replace(/password\s*[:=]\s*\S+/gi, "password: [REDACTED]"); // Passwords
}

/**
 * Build dynamic role-specific system prompt with verified platform context
 */
async function buildSystemPrompt(role: AssistantRole, userId?: string, userName?: string): Promise<string> {
  const baseIdentity = `You are the EduConnects AI Assistant, the intelligent, friendly, and helpful native assistant for the EduConnects learning and teaching platform.

Core Personality & Capabilities:
- Identity: "EduConnects AI Assistant". You speak as a warm, knowledgeable member of the EduConnects team.
- UNRESTRICTED INPUT: The user may ask ANY question in natural language. You must answer directly, helpfully, and conversationally.
- Never restrict the user to predefined question lists, quick replies, or rigid choices. Never say "I can only answer predefined questions" or "Please select from the options above". Quick question buttons on the screen are purely optional shortcuts for the user.
- Multi-Turn Conversation: Maintain context across messages. Understand follow-up questions, pronouns (like "one", "it", "they" referring to previously mentioned classes, courses, or concepts), and conversational continuity.
- Multilingual & Hinglish: Understand and answer fluently in English, Hinglish (e.g., "Educator kaise find kare?", "Mujhe live class join karni hai", "Kya trial class free hoti hai?"), and mixed language queries.
- General Knowledge & Education: For general educational or informational queries (e.g. physics, mathematics, science, AI vs Machine Learning, study strategies, coding, writing an email to an educator, or explaining concepts simply), answer directly, informatively, and clearly. Do NOT refuse general educational questions.
- Simplification: When asked to explain something in simple language or for beginners ("explain like I'm 5", "in simple terms"), provide intuitive analogies and clear, step-by-step explanations.
- Writing Assistance: When asked to draft an email or message to an educator or support, produce a well-formatted, polite, ready-to-use template.
- Platform Knowledge: When answering about EduConnects, provide accurate information based on real website functionality and include relevant links:
  • Learner Portal: [Learner Portal](https://learners.educonnects.co.in)
  • Educator Portal: [Educator Portal](https://educators.educonnects.co.in)
  • Browse Courses: /courses
  • Find Verified Educators: /find-teachers
  • Learner Dashboard: /student/dashboard
  • Learner Courses: /student/courses
  • Learner Live Classes: /student/live-classes
  • Educator Dashboard: /teacher/dashboard
  • Educator Courses: /teacher/courses
  • Educator Live Classes: /teacher/live-classes
  • Educator Verification: /teacher/verification
  • Educator Earnings: /teacher/earnings
  • Admin Dashboard: /admin/dashboard
  • Admin Verification Queue: /admin/verification
  • Password Reset: /forgot-password or click "Forgot Password" on /login
  • Contact Support: /contact or support@educonnects.co.in
- Portals: Whenever a user asks for the "Learner Portal" or "Educator Portal" (or how to access the learner or educator portal), ALWAYS provide the exact clickable link:
  • Learner Portal: [Learner Portal](https://learners.educonnects.co.in)
- Official Ownership, Founder & Company Information:
  Whenever a user asks who owns EduConnects, who is the owner, founder, or creator of EduConnects, you MUST give this clear and consistent answer:
  "EduConnects is founded and owned by Neeraj Shrivastava. EduConnects operates under Shrivastava ProFunnels Ventures Pvt Ltd."

  If the user asks for more details about the owner/founder, provide the approved founder information available in the EduConnects About Us section:
  • Neeraj Shrivastava brings over a decade of experience across education, academic leadership, technology, and entrepreneurship.
  • Academic Background: B.Sc. in Mathematics (2002) and M.Sc. in Computer Science (2004), followed by IAS preparation in Delhi (2009–2011).
  • Educational & Leadership Experience: Worked as an educator at Aspirant International School and Rani Lakshmibai Public School (progressing from TGT to PGT). Served as Principal at AVM Inter College, Lalitpur (2023–2024).
  • Journey & Creation: His transition from student → teacher → academic leader → entrepreneur inspired the creation of EduConnects in 2026.
  STRICT RULE: Do not invent or add any other personal information beyond what is stated above.

  Whenever the user asks for company details, legal information, corporate identity, CIN, or registered office, you MUST provide these EXACT details:
  • Founder & Owner: Neeraj Shrivastava
  • Company / Legal Entity: Shrivastava ProFunnels Ventures Pvt Ltd
  • CIN: U85499UP2024PTC212061
  • Registered Office: Ward No. 8, Basundhara Colony, Chandmari, Lalitpur (UP), 284403
  • Platform / Brand: EduConnects
  STRICT RULE: Do not invent, modify, or substitute any company details under any circumstances.
- Advisory Only: You are advisory and informational. You cannot directly execute database mutations or financial debits (e.g. do not say "I have booked your class"). Explain the exact steps the user can take.
- Security & Privacy: Never disclose unauthorized information, admin passwords, database tokens, or other users' personal information. Never ask for or expose OTPs, passwords, or payment credentials.`;

  let roleInstructions = "";
  let dynamicContext = "";

  if (role === "ADMIN" && userId) {
    let pendingTeachersCount = 0;
    let totalUsers = 0;
    let totalCourses = 0;
    try {
      [pendingTeachersCount, totalUsers, totalCourses] = await Promise.all([
        prisma.teacherProfile.count({ where: { verificationStatus: "PENDING" } }),
        prisma.user.count(),
        prisma.course.count(),
      ]);
      dynamicContext = `Platform Overview: Total Users: ${totalUsers}, Total Courses: ${totalCourses}, Educator Verification Queue Pending: ${pendingTeachersCount}.`;
    } catch {
      // Graceful fallback if database read is deferred
    }

    roleInstructions = `
You are assisting an authenticated ADMINISTRATOR / STAFF MEMBER.
${dynamicContext ? `System Context: ${dynamicContext}` : ""}
Key Admin Navigation:
- Dashboard: /admin/dashboard
- Educator Verification Queue: /admin/verification (review identity proof, degrees, qualifications)
- User Management: /admin/users (search users, view roles, suspend/reactivate)
- Course Moderation: /admin/courses (review curriculum, approve or unpublish)
- Live Classes Oversight: /admin/live-classes
- Financials & Refunds: /admin/payments and /admin/refunds
- Roles & Staff RBAC: /admin/roles and /admin/staff
- System Health: /admin/system-health`;
  } else if (role === "EDUCATOR") {
    let verificationStatus = "PENDING";
    let courseCount = 0;
    if (userId) {
      try {
        const teacherProfile = await prisma.teacherProfile.findUnique({
          where: { userId },
          select: { verificationStatus: true, courses: { select: { id: true } } },
        });
        if (teacherProfile) {
          verificationStatus = teacherProfile.verificationStatus;
          courseCount = teacherProfile.courses.length;
          dynamicContext = `Educator Status: Verification ${verificationStatus}, Courses: ${courseCount}.`;
        }
      } catch {}
    }

    roleInstructions = `
You are assisting an authenticated EDUCATOR (Teacher).
${userName ? `Educator Name: ${userName}.` : ""}
${dynamicContext ? `Account Status: ${dynamicContext}` : ""}
Key Educator Features:
- Educator Dashboard: /teacher/dashboard
- Verification & Onboarding: /teacher/verification (upload ID, degree certificates, cancelled cheque)
- Course Management: /teacher/courses (create recorded courses, upload chapters, set INR ₹ prices)
- Live Classes: /teacher/live-classes (schedule 1-on-1 and group live interactive classes)
- Earnings & Cashfree Payouts: /teacher/earnings
- Profile Settings: /profile
Do not disclose admin dashboards or other educators' confidential data.`;
  } else if (role === "LEARNER") {
    let enrollmentsCount = 0;
    let academicFocusText = "";
    if (userId) {
      try {
        enrollmentsCount = await prisma.enrollment.count({ where: { studentId: userId } });
        const studentProfile = await prisma.studentProfile.findUnique({
          where: { userId },
        });
        if (studentProfile) {
          if (studentProfile.educationType === "DIPLOMA") {
            academicFocusText = `Diploma Studies (${studentProfile.diplomaBranch || "General Engineering"})`;
          } else if (studentProfile.educationType === "SCHOOL") {
            const parts = [
              studentProfile.gradeLevel || "School",
              studentProfile.stream ? `Stream: ${studentProfile.stream}` : null,
              studentProfile.competitiveExam ? `Target Exam: ${studentProfile.competitiveExam}` : null,
            ].filter(Boolean);
            academicFocusText = `School (${parts.join(" • ")})`;
          }
        }
        dynamicContext = `Learner Status: Enrolled in ${enrollmentsCount} courses.${academicFocusText ? ` Academic Focus: ${academicFocusText}.` : ""}`;
      } catch {}
    }

    roleInstructions = `
You are assisting an authenticated LEARNER.
${userName ? `Learner Name: ${userName}.` : ""}
${dynamicContext ? `Academic & Enrollment Context: ${dynamicContext}` : ""}
${academicFocusText ? `Personalization Directive: The learner's academic focus is ${academicFocusText}. Proactively personalize your guidance, subject explanations, homework help, exam tips, and tutor/course recommendations to match this exact syllabus and curriculum level.` : ""}
Key Learner Features:
- Learner Dashboard: /student/dashboard
- My Courses: /student/courses (access enrolled video courses, track lesson progress)
- Live Classes: /student/live-classes (view booked live sessions, join interactive classroom)
- Find Verified Educators: /find-teachers (filter by subject, grade, stream, diploma branch, book sessions)
- Browse Courses: /courses
- Free Practice Exams: /exam
- Payment Receipts: /student/payments
- Profile Settings: /profile`;
  } else {
    roleInstructions = `
You are assisting a PUBLIC VISITOR (Guest) exploring EduConnects.
Guide them through:
- What EduConnects is: A comprehensive platform for interactive live classes and self-paced video courses with verified educators.
- Explore Courses: /courses
- Find Verified Educators: /find-teachers
- Register as a Learner: /register/student
- Apply to Teach as an Educator: /register/teacher
- How It Works: /how-it-works
- Sign In: /login
- Contact Support: /contact or support@educonnects.co.in`;
  }

  return `${baseIdentity}\n\n${roleInstructions}`;
}

/**
 * Intelligent and versatile fallback response engine.
 * Handles:
 * - Specific EduConnects queries (courses, educators, live classes, trials, password resets)
 * - Multi-turn follow-up queries using conversation history context
 * - General educational & knowledge questions (physics, AI/ML, coding, email drafting)
 * - Hinglish queries and conversational remarks
 * - Arbitrary user input without refusal or rigid menus
 */
export function generateFallbackResponse(
  userMessage: string,
  role: AssistantRole,
  history: ChatMessage[] = []
): string {
  const query = userMessage.toLowerCase().trim();

  // Extract recent context from prior messages
  const recentHistory = history.slice(-6);
  const recentContextText = recentHistory.map((h) => h.content.toLowerCase()).join(" ");

  const wasDiscussingLiveClasses =
    recentContextText.includes("live class") ||
    recentContextText.includes("live classes") ||
    recentContextText.includes("classroom") ||
    recentContextText.includes("interactive session");

  const wasDiscussingCourses =
    recentContextText.includes("course") ||
    recentContextText.includes("curriculum") ||
    recentContextText.includes("video lesson");

  const wasDiscussingEducators =
    recentContextText.includes("educator") ||
    recentContextText.includes("teacher") ||
    recentContextText.includes("tutor") ||
    recentContextText.includes("trial");

  const isHinglish =
    /\b(kaise|kya|karna|karni|kare|hai|hain|hota|hoti|hoga|batao|bataiye|madad|chahiye|dhunde|khoje|puchna|shukriya|accha|theek)\b/i.test(
      query
    );

  // 0a. Owner / Founder / Creator Queries
  if (
    query.includes("who owns") ||
    query.includes("who is the owner") ||
    query.includes("who is owner") ||
    query.includes("owner of educonnects") ||
    query.includes("owner of this") ||
    query.includes("who founded") ||
    query.includes("who is the founder") ||
    query.includes("who is founder") ||
    query.includes("founder of educonnects") ||
    query.includes("who created") ||
    query.includes("who is the creator") ||
    query.includes("who is creator") ||
    query.includes("creator of educonnects") ||
    query.includes("who started educonnects") ||
    query.includes("who started this") ||
    query === "owner" ||
    query === "owner?" ||
    query === "founder" ||
    query === "founder?" ||
    query === "creator" ||
    query === "creator?" ||
    query.includes("neeraj shrivastava")
  ) {
    const asksMoreDetails =
      query.includes("detail") ||
      query.includes("more") ||
      query.includes("background") ||
      query.includes("tell me about") ||
      query.includes("who is neeraj") ||
      query.includes("bio") ||
      query.includes("history") ||
      query.includes("experience") ||
      query.includes("qualification") ||
      query.includes("about the founder") ||
      query.includes("about the owner");

    if (asksMoreDetails) {
      return (
        "EduConnects is founded and owned by Neeraj Shrivastava. EduConnects operates under Shrivastava ProFunnels Ventures Pvt Ltd.\n\n" +
        "**About the Founder (from EduConnects About Us):**\n" +
        "• **Leadership & Experience:** Neeraj Shrivastava brings over a decade of experience across education, academic leadership, technology, and entrepreneurship.\n" +
        "• **Academic Background:** B.Sc. in Mathematics (2002) and M.Sc. in Computer Science (2004), followed by IAS preparation in Delhi (2009–2011).\n" +
        "• **Teaching & Principal Experience:** Served as an educator at Aspirant International School and Rani Lakshmibai Public School (progressing from TGT to PGT), and as Principal at AVM Inter College, Lalitpur (2023–2024).\n" +
        "• **Journey & Vision:** His transition from student → teacher → academic leader → entrepreneur inspired the creation of EduConnects in 2026."
      );
    }

    return "EduConnects is founded and owned by Neeraj Shrivastava. EduConnects operates under Shrivastava ProFunnels Ventures Pvt Ltd.";
  }

  // 0b. Official Company & Legal Information Queries
  if (
    query.includes("company information") ||
    query.includes("company info") ||
    query.includes("company details") ||
    query.includes("legal information") ||
    query.includes("legal info") ||
    query.includes("legal details") ||
    query.includes("legal entity") ||
    query.includes("legal name") ||
    query.includes("cin") ||
    query.includes("corporate details") ||
    query.includes("corporate info") ||
    query.includes("corporate information") ||
    query.includes("registered office") ||
    query.includes("registered address") ||
    query.includes("office address") ||
    query.includes("company address") ||
    query.includes("parent company") ||
    query.includes("shrivastava profunnels") ||
    query.includes("company registration") ||
    query === "company" ||
    query === "company?" ||
    query === "what is the company name" ||
    query.includes("company name")
  ) {
    return "Here is the official company and legal information for EduConnects:\n\n" +
      "**EduConnects is founded and owned by Neeraj Shrivastava. EduConnects operates under Shrivastava ProFunnels Ventures Pvt Ltd.**\n\n" +
      "- **Legal Entity:** Shrivastava ProFunnels Ventures Pvt Ltd\n" +
      "- **CIN:** U85499UP2024PTC212061\n" +
      "- **Registered Office:** Ward No. 8, Basundhara Colony, Chandmari, Lalitpur (UP), 284403";
  }

  // 0. Direct Portal Link Queries
  if (
    query.includes("learner portal") ||
    query.includes("learners portal") ||
    query.includes("student portal") ||
    query.includes("students portal") ||
    query.includes("learner link") ||
    query.includes("learners.educonnects.co.in")
  ) {
    return "You can access the EduConnects Learner Portal here:\n\n🎓 [Learner Portal](https://learners.educonnects.co.in)\n\nOn the Learner Portal, you can explore courses, join 1-on-1 and group live interactive classes with verified educators, track your learning progress, and access your enrolled study materials.";
  }

  if (
    query.includes("educator portal") ||
    query.includes("educators portal") ||
    query.includes("teacher portal") ||
    query.includes("teachers portal") ||
    query.includes("educator link") ||
    query.includes("educators.educonnects.co.in")
  ) {
    return "You can access the EduConnects Educator Portal here:\n\n👨‍🏫 [Educator Portal](https://educators.educonnects.co.in)\n\nOn the Educator Portal, educators can manage their teaching profile, schedule live 1-on-1 and group classes, create video courses, track earnings, and complete credential verification.";
  }

  if (
    query === "portal" ||
    query === "portals" ||
    query.includes("portal link") ||
    query.includes("portal links") ||
    query.includes("where is the portal") ||
    query.includes("access portal")
  ) {
    return "EduConnects provides dedicated portals for both learners and educators:\n\n- 🎓 **Learner Portal:** [Learner Portal](https://learners.educonnects.co.in)\n- 👨‍🏫 **Educator Portal:** [Educator Portal](https://educators.educonnects.co.in)\n\nClick either link above to open your respective portal!";
  }

  // 1. Follow-up: "Can I join one?" / "Can I attend?" / "How do I join?"
  if (
    query.includes("can i join") ||
    query.includes("how do i join") ||
    query.includes("how can i join") ||
    query.includes("join one") ||
    query.includes("can i attend")
  ) {
    if (wasDiscussingLiveClasses) {
      return "Yes, absolutely! You can join any scheduled live class on EduConnects.\n\nTo join a live class:\n1. Head over to [Live Classes](/student/live-classes) or find an educator offering live sessions on [Find Educators](/find-teachers).\n2. Select a class topic and time that suits you, then book your seat or trial.\n3. When the class begins, click the **Join Class** button to enter our interactive HD classroom with live video, audio, screen sharing, and real-time chat.";
    }
    if (wasDiscussingCourses) {
      return "Yes! You can enroll in any course at any time.\n\n1. Browse available courses on our [Courses](/courses) page.\n2. Click on the course you want to explore the curriculum and preview sample lessons.\n3. Click **Enroll Now** to get instant lifetime access to all lessons and study resources.";
    }
    return "Yes, you can join both live interactive classes and self-paced recorded courses! You can discover expert educators for live sessions on [Find Educators](/find-teachers), or browse recorded video courses on [Courses](/courses).";
  }

  // 2. Follow-up: "What about payment?" / "How much does it cost?" / "Is it free?"
  if (
    query.includes("payment") ||
    query.includes("how much") ||
    query.includes("cost") ||
    query.includes("pricing") ||
    query.includes("price") ||
    query.includes("is it free") ||
    query.includes("fees")
  ) {
    if (wasDiscussingLiveClasses) {
      return "For live classes, each verified educator sets their own hourly session rate in INR (₹).\n\nKey payment details for live classes:\n- **Trial Lessons:** Many educators offer free or heavily discounted 1-on-1 introductory trial classes so you can test the waters.\n- **Secure Checkout:** Payments are processed securely in INR (₹) through Cashfree using UPI (Google Pay, PhonePe, Paytm), debit/credit cards, or net banking.\n- **Guarantee:** You receive instant payment receipts and our satisfaction guarantee.";
    }
    if (wasDiscussingCourses) {
      return "Course pricing is transparently shown in INR (₹) on every course details page.\n\n- Courses require a one-time payment with **lifetime access** to all lessons, future updates, and downloadable resources.\n- We support all Indian payment methods via Cashfree (UPI, cards, net banking).\n- Every course purchase comes with our 7-day money-back satisfaction guarantee.";
    }
    return "EduConnects offers clear, transparent pricing in INR (₹) across all learning options:\n\n- **Trial Lessons:** Many educators offer complimentary or low-cost introductory trials.\n- **Live Classes & 1-on-1:** Rates are set per hour or per class series by each verified educator.\n- **Video Courses:** One-time purchase for full lifetime access.\n\nAll transactions are powered securely by Cashfree with instant invoices and money-back guarantees.";
  }

  // 3. Explanation request: "Can you explain this in simple language?" / "explain simply" / "easy terms"
  if (
    query.includes("simple language") ||
    query.includes("simple words") ||
    query.includes("explain simply") ||
    query.includes("in easy language") ||
    query.includes("explain like i'm 5") ||
    query.includes("eli5") ||
    query.includes("easy terms")
  ) {
    if (wasDiscussingLiveClasses) {
      return "In simple words:\n\nThink of a live class like a **video call with a personal tutor**, but with special tools. You and the teacher see and talk to each other in real-time, write on a shared whiteboard, and solve questions together—just like sitting in a real classroom, but comfortably from your computer or phone!";
    }
    if (wasDiscussingCourses) {
      return "In simple words:\n\nEduConnects courses are like **high-quality educational video playlists** taught by top educators. You can watch them whenever you want, pause, rewind, and re-watch as many times as you need, at your own speed.";
    }
    return "In simple words:\n\nEduConnects is an online learning website where you can do two main things:\n1. **Join Live Classes:** Meet directly with expert teachers over video for live interactive coaching.\n2. **Watch Video Courses:** Learn at your own pace with on-demand recorded lessons.\n\nYou can also take trial classes to meet teachers before deciding!";
  }

  // 4. Specific General Knowledge: Physics
  if (
    query.includes("physics") ||
    query.includes("interesting about physics") ||
    query.includes("physics fact")
  ) {
    return "Here is something truly mind-bending about physics:\n\n**Time is not absolute—it moves slower the faster you move through space!**\n\nAccording to Albert Einstein's theory of **Special Relativity**, as you approach the speed of light, time actually ticks slower for you relative to someone standing still (a phenomenon called *time dilation*).\n\nFor example, astronauts living aboard the International Space Station traveling at 28,000 km/h age approximately 0.01 seconds slower every year than people on Earth! Another fascinating concept is **quantum entanglement**, where two connected particles instantaneously affect each other even if they are light-years apart.";
  }

  // 5. Specific General Knowledge: AI vs Machine Learning
  if (
    query.includes("ai and machine learning") ||
    query.includes("difference between ai and ml") ||
    query.includes("ai vs ml") ||
    query.includes("artificial intelligence and machine learning")
  ) {
    return "**Artificial Intelligence (AI)** and **Machine Learning (ML)** are closely related, but they are not the same thing:\n\n1. **Artificial Intelligence (AI):**\n   - The broad science of creating machines that can simulate human intelligence, reasoning, problem-solving, and decision-making.\n   - Examples include chess-playing bots, conversational assistants, and self-driving cars.\n\n2. **Machine Learning (ML):**\n   - A specific subfield and technique within AI.\n   - Instead of hand-coding explicit rules, ML systems use statistical algorithms to analyze data, find patterns, and learn from experience on their own.\n\n**Quick Summary:** All Machine Learning is AI, but not all AI is Machine Learning! (AI is the destination; Machine Learning is one of the most powerful vehicles to get there).";
  }

  // 6. Specific Writing Assistance: Draft an email to educator
  if (
    query.includes("write an email") ||
    query.includes("email to my educator") ||
    query.includes("draft an email") ||
    query.includes("message to my teacher") ||
    query.includes("email to teacher")
  ) {
    return "Here is a polite, well-structured email draft you can customize and send to your educator:\n\n---\n\n**Subject:** Question regarding [Course/Class Name] - [Your Name]\n\n**Dear [Educator's Name],**\n\nI hope you are having a wonderful week.\n\nI am currently enrolled in your [Course / Live Class Name] on EduConnects and really enjoying your lessons.\n\nI had a quick question regarding [mention specific topic or chapter from recent class]:\n*[Insert your question or request here in 1-2 sentences]*\n\nWhenever you have a few minutes, I would appreciate your guidance on this. Thank you very much for your time and support!\n\nWarm regards,  \n**[Your Full Name]**  \nLearner on EduConnects  \n[Your Email / Phone Number]\n\n---";
  }

  // 7. Specific Account Support: Forgot Password
  if (
    query.includes("forgot my password") ||
    query.includes("forgot password") ||
    query.includes("reset password") ||
    query.includes("change password") ||
    query.includes("lost password")
  ) {
    return "If you've forgotten your password, you can easily reset it in a few simple steps:\n\n1. Go to the [Sign In Page](/login).\n2. Click on the **Forgot Password?** link below the login form (or visit [/forgot-password](/forgot-password) directly).\n3. Enter your registered EduConnects email address.\n4. Check your inbox for a secure 6-digit verification code / password reset link.\n5. Enter the code and set your new password.\n\nIf you don't see the email within 2 minutes, make sure to check your spam/junk folder or reach out to support@educonnects.co.in.";
  }

  // 8. Platform: Find an Educator / Teacher
  if (
    query.includes("find an educator") ||
    query.includes("find a teacher") ||
    query.includes("find teachers") ||
    query.includes("search teacher") ||
    query.includes("look for educator")
  ) {
    return "You can discover and connect with verified expert educators on our [Find Educators](/find-teachers) directory.\n\nFeatures available:\n- **Smart Filters:** Filter teachers by subject (Mathematics, Science, Coding, Languages, etc.), experience level, hourly fee in INR (₹), and language.\n- **Teacher Profiles:** View their verified credentials, educational degrees, teaching style, and student reviews.\n- **Trial Lessons:** Book a dedicated 1-on-1 trial slot directly from the educator's live availability calendar.";
  }

  // 9. Platform: Explain Live Classes
  if (
    query.includes("live classes") ||
    query.includes("live class") ||
    query.includes("how do live classes work") ||
    query.includes("classroom work")
  ) {
    return "Live classes on EduConnects provide real-time, interactive learning directly with verified instructors:\n\n- **Live HD Video & Audio:** Connect seamlessly with your educator in an interactive virtual classroom.\n- **Interactive Tools:** Collaborate using screen sharing, live chat, interactive whiteboards, and question-and-answer.\n- **Trial & Regular Sessions:** Book 1-on-1 personalized tutoring or group live batches.\n- **Access:** View your upcoming sessions and enter the active classroom anytime from [Live Classes](/student/live-classes).";
  }

  // 10. Platform: Courses Available
  if (
    query.includes("what courses are available") ||
    query.includes("what courses") ||
    query.includes("find a course") ||
    query.includes("browse courses") ||
    query.includes("available courses") ||
    query.includes("courses do you have")
  ) {
    return "EduConnects offers a comprehensive catalog of recorded video courses spanning multiple disciplines:\n\n- **Categories:** Computer Science & Web Development, Data Science & AI, Mathematics & Science, Competitive Exam Prep, Business, and Languages.\n- **Lifetime Access:** Watch self-paced lessons anytime with progress tracking and completion certificates.\n- **Curriculum Previews:** Preview syllabus chapters and sample video lessons before enrolling.\n\nExplore our full selection on the [Courses](/courses) page!";
  }

  // 11. Hinglish queries
  if (isHinglish) {
    if (query.includes("educator") || query.includes("teacher") || query.includes("dhunde")) {
      return "EduConnects par expert educators find karna bahut aasaan hai! Aap hamare [Find Educators](/find-teachers) page par jakar subject, experience, ratings aur hourly fees ke hisaab se filter kar sakte hain. Wahan se aap teacher ka profile check karke trial class bhi book kar sakte hain.";
    }
    if (query.includes("live class") || query.includes("join")) {
      return "Live class attend karne ke liye aap [Live Classes](/student/live-classes) page par jayein. Jab class ka scheduled time hoga, tab **Join Class** button par click karke aap seedhe interactive video classroom me enter ho sakte hain.";
    }
    if (query.includes("course") || query.includes("courses")) {
      return "Aap hamare saare self-paced video courses [Courses](/courses) page par dekh sakte hain. Har course me chapters, video lectures aur downloadable study material hota hai, jise aap apni speed se padh sakte hain.";
    }
    return "Namaste! Main EduConnects Assistant hoon. Main aapki live classes, educators find karne, recorded courses, trial classes ya kisi bhi general sawaal me madad kar sakta hoon. Aap mujhse koi bhi question freely puch sakte hain!";
  }

  // 12. Role-specific portal guidance
  if (query.includes("educator") && (query.includes("teach") || query.includes("become"))) {
    return "To start teaching on EduConnects, sign up at [Join as Educator](/register/teacher). Once registered, upload your verification documents (ID, degree qualifications, and bank details) on your [Verification Dashboard](/teacher/verification) to get approved!";
  }

  if (query.includes("contact") || query.includes("support") || query.includes("help center")) {
    return "Our dedicated support team is here to assist you! Reach out via our [Contact Page](/contact) or email us directly at support@educonnects.co.in. We typically respond within a few hours.";
  }

  if (query.includes("admin") && (role === "ADMIN" || query.includes("dashboard"))) {
    return "The [Admin Dashboard](/admin/dashboard) allows you to oversee platform operations, review the pending educator verification queue at [/admin/verification](/admin/verification), manage user accounts at [/admin/users](/admin/users), and monitor transactions at [/admin/payments](/admin/payments).";
  }

  // 13. Arbitrary / Unrecognized Question Fallback:
  // Must NOT reject the user or show a generic "choose one of these options" message.
  // Address the user question directly with helpful context.
  return `Thank you for your question! 

EduConnects is designed to support flexible, high-quality learning tailored to your goals. Whether you are looking for 1-on-1 mentoring with verified educators on [Find Educators](/find-teachers), comprehensive self-paced video courses on [Courses](/courses), or live interactive classrooms, our platform provides complete educational support.

If you have specific questions about scheduling, subjects, educator credentials, or need assistance with your learning plan, feel free to ask anytime or contact our support team at support@educonnects.co.in!`;
}

/**
 * Handle chat conversation request with OpenAI and persistent context
 */
export async function processAiChat(options: AiChatOptions): Promise<AiChatResult> {
  const { message, userId, role, userName } = options;
  const sanitizedMessage = sanitizeContent(message);

  // 1. Resolve conversation history from options.history or in-memory store or DB
  let conversationId = options.conversationId;
  let historyMessages: ChatMessage[] = [];

  if (options.history && Array.isArray(options.history) && options.history.length > 0) {
    historyMessages = options.history.slice(-MAX_HISTORY_MESSAGES);
  } else if (conversationId && conversationStore.has(conversationId)) {
    historyMessages = conversationStore.get(conversationId)!.messages.slice(-MAX_HISTORY_MESSAGES);
  } else if (conversationId) {
    try {
      if ((prisma as any).aiConversation?.findUnique) {
        const existing = await (prisma as any).aiConversation.findUnique({
          where: { id: conversationId },
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
              take: MAX_HISTORY_MESSAGES,
            },
          },
        });
        if (existing) {
          historyMessages = existing.messages.map((m: any) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));
        }
      }
    } catch {
      // Graceful non-blocking fallback
    }
  }

  if (!conversationId) {
    conversationId = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  // 2. Prepare system prompt and messages
  const systemPrompt = await buildSystemPrompt(role, userId, userName);
  const promptMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...historyMessages.map((m) => ({
      role: m.role,
      content: sanitizeContent(m.content),
    })),
    { role: "user", content: sanitizedMessage },
  ];

  // 3. Check for OPENAI_API_KEY
  const apiKey = process.env.OPENAI_API_KEY;
  const configuredModel = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  let assistantResponse = "";
  let isFallback = false;

  if (apiKey && apiKey.trim().length > 0 && !apiKey.includes("your_openai_api_key_here")) {
    try {
      const openai = new OpenAI({ apiKey });

      // Primary: Attempt OpenAI Responses API
      try {
        if (typeof (openai as any).responses?.create === "function") {
          const response = await (openai as any).responses.create({
            model: configuredModel,
            instructions: systemPrompt,
            input: [
              ...historyMessages.map((m) => ({
                role: m.role,
                content: sanitizeContent(m.content),
              })),
              { role: "user", content: sanitizedMessage },
            ],
          });
          assistantResponse = extractResponseText(response);
        }
      } catch (responsesErr: any) {
        // Fall back to chat.completions if Responses API endpoint is unavailable for this key/model
      }

      // Secondary / Standard: OpenAI Chat Completions API
      if (!assistantResponse) {
        const isReasoningModel =
          configuredModel.startsWith("o1") || configuredModel.startsWith("o3");

        const completionParams: any = {
          model: configuredModel,
          messages: promptMessages,
          // Explicitly configure max_completion_tokens for OpenAI model support
          max_completion_tokens: 700,
          ...(!isReasoningModel ? { temperature: 0.7 } : {}),
        };

        try {
          const completion = await openai.chat.completions.create(completionParams);
          assistantResponse = completion.choices?.[0]?.message?.content?.trim() || "";
        } catch (compErr: any) {
          if (compErr?.message?.includes("temperature")) {
            delete completionParams.temperature;
            const retryCompletion = await openai.chat.completions.create(completionParams);
            assistantResponse = retryCompletion.choices?.[0]?.message?.content?.trim() || "";
          } else {
            throw compErr;
          }
        }
      }
    } catch (err: any) {
      console.error("[AiService] OpenAI API call error:", err?.message || err);
      assistantResponse = generateFallbackResponse(sanitizedMessage, role, historyMessages);
      isFallback = true;
    }
  } else {
    // API key not configured: use intelligent native response engine
    assistantResponse = generateFallbackResponse(sanitizedMessage, role, historyMessages);
    isFallback = true;
  }

  if (!assistantResponse) {
    assistantResponse = TEMPORARY_UNAVAILABLE_MESSAGE;
  }

  // 4. Update session conversation store
  const existingStored = conversationStore.get(conversationId)?.messages || historyMessages;
  const updatedMessages: ChatMessage[] = [
    ...existingStored,
    { role: "user" as const, content: sanitizedMessage },
    { role: "assistant" as const, content: assistantResponse },
  ].slice(-MAX_HISTORY_MESSAGES * 2);

  conversationStore.set(conversationId, {
    id: conversationId,
    role,
    userId,
    messages: updatedMessages,
    updatedAt: Date.now(),
  });

  // 5. Persist to Prisma DB asynchronously (non-blocking for fast UI responsiveness)
  void (async () => {
    try {
      if ((prisma as any).aiConversation?.findUnique) {
        let dbConv = await (prisma as any).aiConversation.findUnique({
          where: { id: conversationId },
        });
        if (!dbConv) {
          dbConv = await (prisma as any).aiConversation.create({
            data: {
              id: conversationId,
              userId: userId || null,
              role,
              title: sanitizedMessage.slice(0, 60),
            },
          });
        }
        if (dbConv && (prisma as any).aiMessage?.createMany) {
          await (prisma as any).aiMessage.createMany({
            data: [
              { conversationId, role: "user", content: sanitizedMessage },
              { conversationId, role: "assistant", content: assistantResponse },
            ],
          });
        }
      }
    } catch (dbErr) {
      // Non-blocking database write
    }
  })();

  return {
    response: assistantResponse,
    conversationId,
    role,
    isFallback,
  };
}

/**
 * Handle streaming chat response with full conversation history
 */
export async function streamAiChat(
  options: AiChatOptions,
  onChunk: (chunk: string) => void
): Promise<AiChatResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const configuredModel = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  // Resolve conversation history
  let historyMessages: ChatMessage[] = [];
  if (options.history && Array.isArray(options.history) && options.history.length > 0) {
    historyMessages = options.history.slice(-MAX_HISTORY_MESSAGES);
  } else if (options.conversationId && conversationStore.has(options.conversationId)) {
    historyMessages = conversationStore.get(options.conversationId)!.messages.slice(-MAX_HISTORY_MESSAGES);
  }

  const conversationId =
    options.conversationId || `conv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const sanitizedMessage = sanitizeContent(options.message);

  if (!apiKey || apiKey.trim().length === 0 || apiKey.includes("your_openai_api_key_here")) {
    const fallback = await processAiChat({
      ...options,
      conversationId,
      history: historyMessages,
    });
    onChunk(fallback.response);
    return fallback;
  }

  try {
    const openai = new OpenAI({ apiKey });
    const systemPrompt = await buildSystemPrompt(options.role, options.userId, options.userName);

    const promptMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...historyMessages.map((m) => ({
        role: m.role,
        content: sanitizeContent(m.content),
      })),
      { role: "user", content: sanitizedMessage },
    ];

    const isReasoningModel =
      configuredModel.startsWith("o1") || configuredModel.startsWith("o3");

    const streamParams: any = {
      model: configuredModel,
      messages: promptMessages,
      // Explicitly configure max_completion_tokens for OpenAI model support
      max_completion_tokens: 700,
      stream: true,
      ...(!isReasoningModel ? { temperature: 0.7 } : {}),
    };

    let stream: any;
    try {
      stream = await openai.chat.completions.create(streamParams);
    } catch (streamInitErr: any) {
      if (streamInitErr?.message?.includes("temperature")) {
        delete streamParams.temperature;
        stream = await openai.chat.completions.create(streamParams);
      } else {
        throw streamInitErr;
      }
    }

    let fullText = "";
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content || "";
      if (delta) {
        fullText += delta;
        onChunk(delta);
      }
    }

    // Persist to in-memory store
    const existingStored = conversationStore.get(conversationId)?.messages || historyMessages;
    const updatedMessages: ChatMessage[] = [
      ...existingStored,
      { role: "user" as const, content: sanitizedMessage },
      { role: "assistant" as const, content: fullText },
    ].slice(-MAX_HISTORY_MESSAGES * 2);

    conversationStore.set(conversationId, {
      id: conversationId,
      role: options.role,
      userId: options.userId,
      messages: updatedMessages,
      updatedAt: Date.now(),
    });

    // Attempt DB persistence asynchronously
    void (async () => {
      try {
        if ((prisma as any).aiConversation?.findUnique) {
          let dbConv = await (prisma as any).aiConversation.findUnique({
            where: { id: conversationId },
          });
          if (!dbConv) {
            await (prisma as any).aiConversation.create({
              data: {
                id: conversationId,
                userId: options.userId || null,
                role: options.role,
                title: sanitizedMessage.slice(0, 60),
              },
            });
          }
          await (prisma as any).aiMessage.createMany({
            data: [
              { conversationId, role: "user", content: sanitizedMessage },
              { conversationId, role: "assistant", content: fullText },
            ],
          });
        }
      } catch {}
    })();

    return {
      response: fullText,
      conversationId,
      role: options.role,
    };
  } catch (err) {
    console.error("[AiService] Streaming failed, falling back:", err);
    const fallback = await processAiChat({
      ...options,
      conversationId,
      history: historyMessages,
    });
    onChunk(fallback.response);
    return fallback;
  }
}
