import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedSyntheticEducators } from "./seed-synthetic-educators";

function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch {}
}
loadEnv();

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
    console.error("❌ Refusing to run database seed in PRODUCTION environment without explicit ALLOW_PRODUCTION_SEED=true.");
    console.error("   This safeguards against accidental data deletion or seeding dummy courses on production.");
    process.exit(1);
  }
  console.log("🌱 Starting EduConnects Database Seeding for Module 04...");

  // Check for existing primary admin user
  let existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { email: "educonnects.com@gmail.com" },
        // Legacy fallback: locate existing unmigrated admin account to update in-place without duplication
        { email: "educonnets.com@gmail.com" },
        { email: "admin@educonnects.com" },
        { email: "admin@educonnect.com" },
        {
          role: "ADMIN",
          profile: {
            firstName: "System",
            lastName: "Administrator",
          },
        },
      ],
    },
    include: {
      profile: true,
    },
  });

  // Check for existing real educator Neeraj Shrivastava (myprofunnels@gmail.com)
  let existingRealEducator = await prisma.user.findUnique({
    where: { email: "myprofunnels@gmail.com" },
    include: {
      profile: true,
      teacherProfile: true,
    },
  });

  // Check for existing dedicated test educator Dhruv Jari (dhruvjari2006@gmail.com)
  let existingTestEducator = await prisma.user.findUnique({
    where: { email: "dhruvjari2006@gmail.com" },
    include: {
      profile: true,
      teacherProfile: true,
    },
  });

  const preservedUserIds = [existingAdmin?.id, existingRealEducator?.id, existingTestEducator?.id].filter(Boolean) as string[];

  // Clean existing data while preserving admin user and real educator
  await prisma.classroomFile.deleteMany();
  await prisma.classroomMessage.deleteMany();
  await prisma.classAttendance.deleteMany();
  await prisma.liveClassSession.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.liveClassSlot.deleteMany();
  await prisma.adminNote.deleteMany();
  await prisma.teacherVerificationHistory.deleteMany();
  await prisma.teacherDocument.deleteMany();
  await prisma.teacherCertificate.deleteMany();
  await prisma.teacherQualification.deleteMany();
  await prisma.course.deleteMany();
  await prisma.emailVerification.deleteMany({
    where: preservedUserIds.length > 0 ? { userId: { notIn: preservedUserIds } } : {},
  });
  const preservedTeacherProfileIds = [
    existingRealEducator?.teacherProfile?.id,
    existingTestEducator?.teacherProfile?.id,
  ].filter(Boolean) as string[];

  await prisma.studentProfile.deleteMany();
  await prisma.teacherProfile.deleteMany({
    where: preservedTeacherProfileIds.length > 0 ? { id: { notIn: preservedTeacherProfileIds } } : {},
  });
  if (preservedUserIds.length > 0) {
    await prisma.profile.deleteMany({
      where: { userId: { notIn: preservedUserIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { notIn: preservedUserIds } },
    });
  } else {
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();
  }

  const defaultPassword = process.env.TEST_EDUCATOR_PASSWORD || "Password123!";
  const defaultPasswordHash = await bcrypt.hash(defaultPassword, 10);
  const now = new Date();

  // 1. Seed or Update Admin User (Idempotent)
  let admin: any;
  if (existingAdmin) {
    admin = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        email: "educonnects.com@gmail.com",
        role: "ADMIN",
        emailVerified: true,
      },
      include: { profile: true },
    });
    if (!admin.profile) {
      await prisma.profile.create({
        data: {
          userId: admin.id,
          firstName: "System",
          lastName: "Administrator",
          bio: "EduConnects Governance & Platform Administrator",
        },
      });
    }
    console.log(`✅ Existing Admin Preserved & Updated: ${admin.email}`);
  } else {
    admin = await prisma.user.create({
      data: {
        email: "educonnects.com@gmail.com",
        passwordHash: defaultPasswordHash,
        role: "ADMIN",
        emailVerified: true,
        emailVerifiedAt: now,
        profile: {
          create: {
            firstName: "System",
            lastName: "Administrator",
            bio: "EduConnects Governance & Platform Administrator",
          },
        },
      },
      include: { profile: true },
    });
    console.log(`✅ Admin Created: ${admin.email}`);
  }

  // 1b. Ensure Real Educator Account (Neeraj Shrivastava / myprofunnels@gmail.com) exists
  const realEducator = await prisma.user.upsert({
    where: { email: "myprofunnels@gmail.com" },
    update: {
      role: "TEACHER",
      emailVerified: true,
    },
    create: {
      email: "myprofunnels@gmail.com",
      passwordHash: defaultPasswordHash,
      role: "TEACHER",
      emailVerified: true,
      emailVerifiedAt: now,
      profile: {
        create: {
          firstName: "Neeraj",
          lastName: "Shrivastava",
          bio: "Senior Physics & Mathematics Faculty and Platform Educator.",
          avatarUrl: "/images/educators/educator_01.jpg",
          phone: "+91 98200 12345",
        },
      },
      teacherProfile: {
        create: {
          headline: "Senior STEM Faculty & Competitive Exam Specialist",
          subjects: "Physics, Mathematics, Calculus",
          experienceYears: 16,
          hourlyRate: 350.0,
          languages: "English, Hindi",
          teachingMode: "BOTH",
          verificationStatus: "VERIFIED",
          verifiedAt: now,
          isSeededProfile: false,
        },
      },
    },
    include: { teacherProfile: true },
  });
  console.log(`✅ Real Educator Preserved/Created: ${realEducator.email}`);

  const testEducatorEmail = process.env.TEST_EDUCATOR_EMAIL || "dhruvjari2006@gmail.com";
  const testEducator = await prisma.user.upsert({
    where: { email: testEducatorEmail },
    update: {
      passwordHash: defaultPasswordHash,
      role: "TEACHER",
      status: "ACTIVE",
      emailVerified: true,
    },
    create: {
      email: testEducatorEmail,
      passwordHash: defaultPasswordHash,
      role: "TEACHER",
      status: "ACTIVE",
      emailVerified: true,
      emailVerifiedAt: now,
      profile: {
        create: {
          firstName: "Dhruv",
          lastName: "Jari",
          bio: "Dedicated Educator Account",
        },
      },
      teacherProfile: {
        create: {
          headline: "Verified Educator",
          subjects: "Mathematics, Physics",
          experienceYears: 5,
          hourlyRate: 300.0,
          teachingMode: "BOTH",
          verificationStatus: "VERIFIED",
          verifiedAt: now,
          isSeededProfile: false,
        },
      },
    },
    include: { teacherProfile: true },
  });

  if (testEducator.teacherProfile) {
    await prisma.teacherProfile.update({
      where: { id: testEducator.teacherProfile.id },
      data: {
        verificationStatus: "VERIFIED",
        verifiedAt: testEducator.teacherProfile.verifiedAt || now,
        isSeededProfile: false,
      },
    });
  } else {
    await prisma.teacherProfile.create({
      data: {
        userId: testEducator.id,
        headline: "Verified Educator",
        subjects: "Mathematics, Physics",
        experienceYears: 5,
        hourlyRate: 300.0,
        teachingMode: "BOTH",
        verificationStatus: "VERIFIED",
        verifiedAt: now,
        isSeededProfile: false,
      },
    });
  }
  console.log(`✅ Test Educator Preserved/Created: ${testEducator.email}`);

  // 2. Seed Verified Teacher 1: Ananya Sharma (Mathematics)
  const teacher1 = await prisma.user.create({
    data: {
      email: "teacher@educonnects.com",
      passwordHash: defaultPasswordHash,
      role: "TEACHER",
      emailVerified: true,
      emailVerifiedAt: now,
      profile: {
        create: {
          firstName: "Ananya",
          lastName: "Sharma",
          bio: "Experienced Mathematics & Physics Educator with 8+ years teaching experience.",
          avatarUrl: "/images/educators/educator_02.jpg",
          phone: "+91 98765 43210",
        },
      },
      teacherProfile: {
        create: {
          headline: "Senior STEM Educator & Olympiad Coach",
          subjects: "Mathematics, Physics, Calculus",
          experienceYears: 8,
          hourlyRate: 300.0,
          languages: "English, Hindi",
          teachingMode: "BOTH",
          verificationStatus: "VERIFIED",
          verifiedAt: now,
          rating: 4.95,
          teacherQualifications: {
            create: [
              {
                degree: "M.Sc. Mathematics",
                institution: "Indian Institute of Technology (IIT) Delhi",
                year: 2018,
                specialization: "Applied Calculus & Mechanics",
              },
            ],
          },
          teacherCertificates: {
            create: [
              {
                name: "Certified STEM Lead Tutor",
                issuer: "National Science Education Board",
                issueDate: new Date("2020-05-15"),
              },
            ],
          },
          teacherDocuments: {
            create: [
              {
                category: "IDENTITY",
                fileName: "ananya_sharma_id.pdf",
                fileType: "application/pdf",
                fileSize: 450000,
                storageKey: "seed_ananya_id.pdf",
              },
            ],
          },
        },
      },
    },
    include: { teacherProfile: true },
  });
  console.log(`✅ Verified Teacher Created: ${teacher1.email}`);

  // 3. Seed Pending Teacher Applicant: Rohan Deshmukh
  const pendingTeacher = await prisma.user.create({
    data: {
      email: "pending.teacher@educonnects.com",
      passwordHash: defaultPasswordHash,
      role: "TEACHER",
      emailVerified: true,
      emailVerifiedAt: now,
      profile: {
        create: {
          firstName: "Rohan",
          lastName: "Deshmukh",
          bio: "Passionate Computer Science instructor specializing in Python, Algorithms, and Web Development.",
          avatarUrl: "/images/educators/educator_11.jpg",
          phone: "+91 98765 12345",
        },
      },
      teacherProfile: {
        create: {
          headline: "Computer Science Lecturer & Coding Mentor",
          subjects: "Computer Science, Programming, Python",
          experienceYears: 5,
          hourlyRate: 250.0,
          languages: "English, Marathi, Hindi",
          teachingMode: "ONLINE",
          verificationStatus: "PENDING",
          submittedAt: now,
          teacherQualifications: {
            create: [
              {
                degree: "B.S. Computer Science",
                institution: "University of California, Berkeley",
                year: 2021,
                specialization: "Software Systems",
              },
            ],
          },
          teacherCertificates: {
            create: [
              {
                name: "AWS Certified Solutions Architect",
                issuer: "Amazon Web Services",
                issueDate: new Date("2023-01-10"),
              },
            ],
          },
          teacherDocuments: {
            create: [
              {
                category: "IDENTITY",
                fileName: "marcus_vance_driver_license.png",
                fileType: "image/png",
                fileSize: 320000,
                storageKey: "seed_marcus_identity.png",
              },
              {
                category: "QUALIFICATION",
                fileName: "berkeley_degree_certificate.pdf",
                fileType: "application/pdf",
                fileSize: 890000,
                storageKey: "seed_marcus_degree.pdf",
              },
            ],
          },
        },
      },
    },
  });
  console.log(`✅ Pending Teacher Created: ${pendingTeacher.email}`);

  // 4. Seed Rejected Teacher: Priya Patel
  const rejectedTeacher = await prisma.user.create({
    data: {
      email: "rejected.teacher@educonnects.com",
      passwordHash: defaultPasswordHash,
      role: "TEACHER",
      emailVerified: true,
      emailVerifiedAt: now,
      profile: {
        create: {
          firstName: "Priya",
          lastName: "Patel",
          bio: "Biology educator looking to mentor high school AP students.",
        },
      },
      teacherProfile: {
        create: {
          headline: "AP Biology & Life Sciences Tutor",
          subjects: "Biology, Chemistry",
          experienceYears: 4,
          hourlyRate: 250.0,
          verificationStatus: "REJECTED",
          submittedAt: new Date(Date.now() - 86400000 * 3),
          rejectedAt: new Date(Date.now() - 86400000),
          rejectionReason: "Uploaded identity document image is blurred and illegible. Please re-upload a clear copy of your National ID or Passport.",
        },
      },
    },
  });
  console.log(`✅ Rejected Teacher Created: ${rejectedTeacher.email}`);

  // 5. Seed Suspended Teacher: Alan Turing
  const suspendedTeacher = await prisma.user.create({
    data: {
      email: "suspended.teacher@educonnects.com",
      passwordHash: defaultPasswordHash,
      role: "TEACHER",
      emailVerified: true,
      emailVerifiedAt: now,
      profile: {
        create: {
          firstName: "Alan",
          lastName: "Turing",
          bio: "Discrete Mathematics Specialist.",
        },
      },
      teacherProfile: {
        create: {
          headline: "Discrete Mathematics & Cryptography Tutor",
          subjects: "Mathematics",
          experienceYears: 10,
          hourlyRate: 300.0,
          verificationStatus: "SUSPENDED",
          submittedAt: new Date(Date.now() - 86400000 * 10),
          verifiedAt: new Date(Date.now() - 86400000 * 8),
          suspendedAt: new Date(Date.now() - 86400000 * 2),
          suspensionReason: "Platform compliance review regarding repeated slot cancellations.",
        },
      },
    },
  });
  console.log(`✅ Suspended Teacher Created: ${suspendedTeacher.email}`);

  // 6. Seed Student User
  const student = await prisma.user.create({
    data: {
      email: "student@educonnects.com",
      passwordHash: defaultPasswordHash,
      role: "STUDENT",
      emailVerified: true,
      emailVerifiedAt: now,
      profile: {
        create: {
          firstName: "Alex",
          lastName: "Morgan",
          bio: "High school sophomore eager to learn Advanced Algebra & Science.",
        },
      },
      studentProfile: {
        create: {
          gradeLevel: "Grade 10",
          interests: "Mathematics, Computer Science, Chemistry",
        },
      },
    },
  });
  console.log(`✅ Student Created: ${student.email}`);

  // 7. Seed Course for Verified Real Educator
  const courseTeacherProfileId = realEducator.teacherProfile?.id || teacher1.teacherProfile?.id;
  if (courseTeacherProfileId) {
    const seededCourse = await prisma.course.upsert({
      where: { slug: "advanced-calculus-mastery" },
      update: {
        status: "PUBLISHED",
        publishedAt: now,
        price: 499.0,
        teacherId: courseTeacherProfileId,
      },
      create: {
        title: "Advanced Calculus & Analytical Geometry",
        slug: "advanced-calculus-mastery",
        description: "Master differential equations, integrals, and vector analysis with step-by-step guidance.",
        subject: "Mathematics",
        category: "General",
        level: "INTERMEDIATE",
        gradeLevel: "Grade 11",
        price: 499.0,
        rating: 4.95,
        reviewCount: 42,
        lessonCount: 2,
        durationHours: 3.5,
        thumbnailUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&auto=format&fit=crop&q=80",
        status: "PUBLISHED",
        publishedAt: now,
        teacherId: courseTeacherProfileId,
        learningOutcomes: JSON.stringify(["Master differential equations", "Understand vector calculus"]),
        requirements: JSON.stringify(["Basic algebra and trigonometry"]),
        sections: {
          create: [
            {
              title: "Section 1: Foundations of Calculus",
              order: 1,
              lessons: {
                create: [
                  {
                    title: "Lesson 1: Limits & Continuity",
                    type: "VIDEO",
                    durationSeconds: 1800,
                    order: 1,
                    status: "READY",
                    content: "Comprehensive overview of limit definitions and continuous functions.",
                  },
                  {
                    title: "Lesson 2: Derivatives & Rate of Change",
                    type: "VIDEO",
                    durationSeconds: 2400,
                    order: 2,
                    status: "READY",
                    content: "Fundamental theorem of calculus and derivative applications.",
                  },
                ],
              },
            },
          ],
        },
      },
    });
    console.log(`✅ Seeded Course Published: ${seededCourse.title}`);
  }

    // 8. Seed Live Class Slot & Session for Module 06 Testing
  if (teacher1.teacherProfile) {
    const startTime = new Date(Date.now() - 5 * 60 * 1000); // Started 5 mins ago
    const endTime = new Date(Date.now() + 55 * 60 * 1000); // Ends in 55 mins

    const liveSlot = await prisma.liveClassSlot.create({
      data: {
        teacherId: teacher1.teacherProfile.id,
        title: "Mathematics — Algebra Basics",
        description: "Interactive live session covering quadratic equations, functions, and graphical analysis.",
        subject: "Mathematics",
        startTime,
        endTime,
        maxCapacity: 15,
        price: 25.0,
        status: "SCHEDULED",
      },
    });

    // Create booking for student
    const booking = await prisma.booking.create({
      data: {
        liveClassSlotId: liveSlot.id,
        studentId: student.id,
        status: "CONFIRMED",
      },
    });
    console.log(`✅ Student Booking Created: ${booking.id} for slot ${liveSlot.title}`);

    // Create session
    const session = await prisma.liveClassSession.create({
      data: {
        id: "demo-math-session-001",
        liveClassSlotId: liveSlot.id,
        teacherId: teacher1.teacherProfile.id,
        roomId: "room-math-algebra-101",
        status: "OPEN",
        scheduledStartAt: startTime,
        scheduledEndAt: endTime,
        actualStartAt: startTime,
      },
    });
    console.log(`✅ Live Class Session Created: ${session.id} (Room: ${session.roomId})`);
  }

  // 9. Seed the 20 Indian synthetic educator profiles for public discovery
  await seedSyntheticEducators();

  console.log("\n🎉 EduConnects Database Seeding Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
