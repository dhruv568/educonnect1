import { prisma } from "@/lib/prisma";
import { syncMuxAssetStatus } from "@/lib/mux/mux-client";

export interface CourseFilterParams {
  search?: string;
  subject?: string;
  category?: string;
  level?: string;
  priceMax?: number;
  ratingMin?: number;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export interface CreateCourseInput {
  title: string;
  subtitle?: string;
  description: string;
  subject: string;
  category?: string;
  level?: string;
  gradeLevel?: string;
  language?: string;
  price: number;
  thumbnailUrl?: string;
  learningOutcomes?: string[];
  requirements?: string[];
}

export class LmsService {
  /**
   * Helper to slugify course title
   */
  static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /**
   * Generate a guaranteed unique slug for a course
   */
  static async generateUniqueSlug(title: string, currentCourseId?: string): Promise<string> {
    const baseSlug = this.slugify(title) || "course";
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await prisma.course.findUnique({ where: { slug } });
      if (!existing || existing.id === currentCourseId) {
        return slug;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Get public published courses with search, filters, sorting & pagination
   */
  static async getPublicCourses(params: CourseFilterParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(50, params.limit || 12));
    const skip = (page - 1) * limit;

    const where: any = {
      status: "PUBLISHED",
    };

    if (params.subject && params.subject !== "all") {
      where.subject = { equals: params.subject, mode: "insensitive" };
    }

    if (params.category && params.category !== "all") {
      where.category = { equals: params.category, mode: "insensitive" };
    }

    if (params.level && params.level !== "all") {
      where.level = { equals: params.level, mode: "insensitive" };
    }

    if (params.priceMax !== undefined && !isNaN(params.priceMax)) {
      where.price = { lte: params.priceMax };
    }

    if (params.ratingMin !== undefined && !isNaN(params.ratingMin)) {
      where.rating = { gte: params.ratingMin };
    }

    if (params.search) {
      const query = params.search.trim().toLowerCase();
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { subject: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
        {
          teacher: {
            user: {
              profile: {
                OR: [
                  { firstName: { contains: query, mode: "insensitive" } },
                  { lastName: { contains: query, mode: "insensitive" } },
                ],
              },
            },
          },
        },
      ];
    }

    let orderBy: any = { createdAt: "desc" };
    if (params.sortBy === "rating") {
      orderBy = { rating: "desc" };
    } else if (params.sortBy === "newest") {
      orderBy = { createdAt: "desc" };
    } else if (params.sortBy === "most_enrolled") {
      orderBy = { enrollmentCount: "desc" };
    } else if (params.sortBy === "price_asc") {
      orderBy = { price: "asc" };
    } else if (params.sortBy === "price_desc") {
      orderBy = { price: "desc" };
    } else if (params.sortBy === "shortest") {
      orderBy = { durationHours: "asc" };
    } else if (params.sortBy === "longest") {
      orderBy = { durationHours: "desc" };
    }

    const [totalCount, courses] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          teacher: {
            include: {
              user: {
                include: { profile: true },
              },
            },
          },
        },
      }),
    ]);

    const formattedCourses = courses.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      subtitle: c.subtitle,
      description: c.description,
      subject: c.subject,
      category: c.category || "General",
      level: c.level,
      gradeLevel: c.gradeLevel,
      price: c.price,
      rating: c.rating,
      reviewCount: c.reviewCount,
      lessonCount: c.lessonCount,
      durationHours: c.durationHours,
      enrollmentCount: c.enrollmentCount,
      thumbnailUrl: c.thumbnailUrl || "/images/course-placeholder.jpg",
      status: c.status,
      teacher: {
        id: c.teacher.id,
        name: `${c.teacher.user.profile?.firstName || ""} ${c.teacher.user.profile?.lastName || ""}`.trim() || "EduConnects Instructor",
        avatarUrl: c.teacher.user.profile?.avatarUrl,
        headline: c.teacher.headline,
        isVerified: c.teacher.verificationStatus === "VERIFIED",
      },
    }));

    return {
      courses: formattedCourses,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  }

  /**
   * Get public details for a course by slug or ID
   */
  static async getCourseBySlug(slugOrId: string, userId?: string) {
    const course = await prisma.course.findFirst({
      where: {
        OR: [{ slug: slugOrId }, { id: slugOrId }],
      },
      include: {
        teacher: {
          include: {
            user: {
              include: { profile: true },
            },
          },
        },
        sections: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                description: true,
                type: true,
                durationSeconds: true,
                order: true,
                isPreview: true,
                status: true,
              },
            },
          },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            student: {
              include: { profile: true },
            },
          },
        },
      },
    });

    if (!course) return null;

    let isEnrolled = false;
    let enrollmentStatus: string | null = null;
    let userProgressPercentage = 0;

    if (userId) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: userId,
            courseId: course.id,
          },
        },
        include: {
          lessonProgresses: true,
        },
      });

      if (enrollment) {
        isEnrolled = enrollment.status === "ACTIVE" || enrollment.status === "COMPLETED";
        enrollmentStatus = enrollment.status;

        const totalLessons = course.sections.reduce((acc, s) => acc + s.lessons.length, 0);
        const completedCount = enrollment.lessonProgresses.filter((p) => p.completed).length;
        userProgressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      }
    }

    let parsedOutcomes: string[] = [];
    if (course.learningOutcomes) {
      try {
        parsedOutcomes = JSON.parse(course.learningOutcomes);
      } catch {
        parsedOutcomes = course.learningOutcomes.split("\n").filter((line) => line.trim().length > 0);
      }
    }

    let parsedRequirements: string[] = [];
    if (course.requirements) {
      try {
        parsedRequirements = JSON.parse(course.requirements);
      } catch {
        parsedRequirements = course.requirements.split("\n").filter((line) => line.trim().length > 0);
      }
    }

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      subtitle: course.subtitle,
      description: course.description,
      subject: course.subject,
      category: course.category || "General",
      level: course.level,
      gradeLevel: course.gradeLevel,
      language: course.language,
      price: course.price,
      rating: course.rating,
      reviewCount: course.reviewCount,
      lessonCount: course.lessonCount,
      durationHours: course.durationHours,
      enrollmentCount: course.enrollmentCount,
      thumbnailUrl: course.thumbnailUrl || "/images/course-placeholder.jpg",
      status: course.status,
      learningOutcomes: parsedOutcomes,
      requirements: parsedRequirements,
      publishedAt: course.publishedAt,
      isEnrolled,
      enrollmentStatus,
      userProgressPercentage,
      teacher: {
        id: course.teacher.id,
        name: `${course.teacher.user.profile?.firstName || ""} ${course.teacher.user.profile?.lastName || ""}`.trim() || "EduConnects Instructor",
        avatarUrl: course.teacher.user.profile?.avatarUrl,
        headline: course.teacher.headline || "Passionate Educator",
        bio: course.teacher.bio || "Experienced teacher dedicated to student growth.",
        rating: course.teacher.rating,
        experienceYears: course.teacher.experienceYears,
        subjects: course.teacher.subjects,
        isVerified: course.teacher.verificationStatus === "VERIFIED",
      },
      sections: course.sections.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        order: s.order,
        lessons: s.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          description: l.description,
          type: l.type,
          durationSeconds: l.durationSeconds,
          order: l.order,
          isPreview: l.isPreview,
        })),
      })),
      reviews: course.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        review: r.review,
        createdAt: r.createdAt,
        studentName: `${r.student.profile?.firstName || "Student"} ${r.student.profile?.lastName || ""}`.trim(),
        studentAvatar: r.student.profile?.avatarUrl,
      })),
    };
  }

  /**
   * Get course details formatted specifically for course preview with authorization rules.
   */
  static async getCoursePreview(slugOrId: string, session?: { id?: string; userId?: string; role?: string } | null) {
    const course = await prisma.course.findFirst({
      where: {
        OR: [{ slug: slugOrId }, { id: slugOrId }],
      },
      include: {
        teacher: {
          include: {
            user: {
              include: { profile: true },
            },
          },
        },
        sections: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              include: {
                videoAssets: true,
              },
            },
          },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            student: {
              include: { profile: true },
            },
          },
        },
      },
    });

    if (!course) {
      throw new Error("NOT_FOUND: Course not found.");
    }

    const userId = session?.userId || session?.id;
    const userRole = session?.role;

    // Authorization rule check for unpublished courses
    if (course.status !== "PUBLISHED") {
      let canAccessDraft = false;
      if (userRole === "ADMIN") {
        canAccessDraft = true;
      } else if (userRole === "TEACHER" && userId) {
        const teacherProfile = await prisma.teacherProfile.findUnique({
          where: { userId },
        });
        if (teacherProfile && teacherProfile.id === course.teacherId) {
          canAccessDraft = true;
        }
      }

      if (!canAccessDraft) {
        throw new Error("UNAUTHORIZED: This course is not currently available for public preview.");
      }
    }

    let isEnrolled = false;
    let enrollmentStatus: string | null = null;

    if (userId) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: userId,
            courseId: course.id,
          },
        },
      });

      if (enrollment) {
        isEnrolled = enrollment.status === "ACTIVE" || enrollment.status === "COMPLETED";
        enrollmentStatus = enrollment.status;
      }
    }

    let parsedOutcomes: string[] = [];
    if (course.learningOutcomes) {
      try {
        parsedOutcomes = JSON.parse(course.learningOutcomes);
      } catch {
        parsedOutcomes = course.learningOutcomes.split("\n").filter((line) => line.trim().length > 0);
      }
    }

    let parsedRequirements: string[] = [];
    if (course.requirements) {
      try {
        parsedRequirements = JSON.parse(course.requirements);
      } catch {
        parsedRequirements = course.requirements.split("\n").filter((line) => line.trim().length > 0);
      }
    }

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      subtitle: course.subtitle,
      description: course.description,
      subject: course.subject,
      category: course.category || "General",
      level: course.level,
      gradeLevel: course.gradeLevel,
      language: course.language,
      price: course.price,
      rating: course.rating,
      reviewCount: course.reviewCount,
      lessonCount: course.lessonCount,
      durationHours: course.durationHours,
      enrollmentCount: course.enrollmentCount,
      thumbnailUrl: course.thumbnailUrl || "/images/course-placeholder.jpg",
      status: course.status,
      learningOutcomes: parsedOutcomes,
      requirements: parsedRequirements,
      publishedAt: course.publishedAt,
      isEnrolled,
      enrollmentStatus,
      teacher: {
        id: course.teacher.id,
        name: `${course.teacher.user.profile?.firstName || ""} ${course.teacher.user.profile?.lastName || ""}`.trim() || "EduConnects Instructor",
        avatarUrl: course.teacher.user.profile?.avatarUrl,
        headline: course.teacher.headline || "Passionate Educator",
        bio: course.teacher.bio || "Experienced teacher dedicated to student growth.",
        rating: course.teacher.rating,
        experienceYears: course.teacher.experienceYears,
        subjects: course.teacher.subjects,
        isVerified: course.teacher.verificationStatus === "VERIFIED",
      },
      sections: course.sections.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        order: s.order,
        lessons: s.lessons.map((l) => {
          const mainVideoAsset = l.videoAssets?.[0];
          return {
            id: l.id,
            title: l.title,
            description: l.description,
            type: l.type,
            durationSeconds: l.durationSeconds,
            order: l.order,
            isPreview: l.isPreview,
            status: l.status,
            videoProvider: l.videoProvider,
            videoUrl: l.videoUrl || (l.videoAssetId ? `/api/videos/${l.videoAssetId}/stream` : null),
            videoAssetId: l.videoAssetId,
            videoAsset: mainVideoAsset
              ? {
                  id: mainVideoAsset.id,
                  playbackId: mainVideoAsset.playbackId,
                  status: mainVideoAsset.status,
                  duration: mainVideoAsset.duration,
                  aspectRatio: mainVideoAsset.aspectRatio,
                }
              : null,
          };
        }),
      })),
      reviews: course.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        review: r.review,
        createdAt: r.createdAt,
        studentName: `${r.student.profile?.firstName || "Student"} ${r.student.profile?.lastName || ""}`.trim(),
        studentAvatar: r.student.profile?.avatarUrl,
      })),
    };
  }

  /**
   * Get teacher's own courses dashboard list
   */
  static async getTeacherCourses(teacherUserId: string) {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });

    if (!teacher) {
      throw new Error("TEACHER_NOT_FOUND: Teacher profile does not exist.");
    }

    const courses = await prisma.course.findMany({
      where: { teacherId: teacher.id },
      orderBy: { updatedAt: "desc" },
      include: {
        sections: {
          include: { lessons: true },
        },
        enrollments: true,
      },
    });

    const formatted = courses.map((c) => {
      const totalLessons = c.sections.reduce((acc, s) => acc + s.lessons.length, 0);
      const activeEnrollments = c.enrollments.filter((e) => e.status === "ACTIVE" || e.status === "COMPLETED").length;
      const completedEnrollments = c.enrollments.filter((e) => e.status === "COMPLETED").length;
      const completionRate = activeEnrollments > 0 ? Math.round((completedEnrollments / activeEnrollments) * 100) : 0;

      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        subject: c.subject,
        level: c.level,
        price: c.price,
        status: c.status,
        rating: c.rating,
        thumbnailUrl: c.thumbnailUrl || "/images/course-placeholder.jpg",
        lessonCount: totalLessons,
        enrolledCount: activeEnrollments,
        completionRate,
        updatedAt: c.updatedAt,
      };
    });

    const totalCourses = formatted.length;
    const publishedCourses = formatted.filter((c) => c.status === "PUBLISHED").length;
    const draftCourses = formatted.filter((c) => c.status === "DRAFT").length;
    const totalStudents = formatted.reduce((acc, c) => acc + c.enrolledCount, 0);

    return {
      courses: formatted,
      stats: {
        totalCourses,
        publishedCourses,
        draftCourses,
        totalStudents,
      },
    };
  }

  /**
   * Create a new draft course for teacher
   */
  static async createTeacherCourse(teacherUserId: string, input: CreateCourseInput) {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });

    if (!teacher) {
      throw new Error("TEACHER_NOT_FOUND: Teacher profile required to create courses.");
    }

    const isVerified =
      teacher.verificationStatus === "VERIFIED" ||
      teacher.verificationStatus === "APPROVED";

    if (!isVerified) {
      throw new Error("FORBIDDEN: Educator verification is required before creating courses.");
    }

    const slug = await LmsService.generateUniqueSlug(input.title);

    const outcomesStr = input.learningOutcomes ? JSON.stringify(input.learningOutcomes) : null;
    const reqsStr = input.requirements ? JSON.stringify(input.requirements) : null;

    const course = await prisma.course.create({
      data: {
        teacherId: teacher.id,
        title: input.title.trim(),
        subtitle: input.subtitle?.trim(),
        slug,
        description: input.description.trim(),
        subject: input.subject.trim(),
        category: input.category?.trim() || "General",
        level: input.level || "BEGINNER",
        gradeLevel: input.gradeLevel?.trim(),
        language: input.language || "English",
        price: Number(input.price) || 0,
        thumbnailUrl: input.thumbnailUrl,
        learningOutcomes: outcomesStr,
        requirements: reqsStr,
        status: "DRAFT",
      },
    });

    return course;
  }

  /**
   * Get full teacher course editor payload with checklist validation
   */
  static async getTeacherCourseEditorDetails(teacherUserId: string, courseId: string) {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });

    if (!teacher) throw new Error("UNAUTHORIZED: Not a teacher.");

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              include: { resources: true, videoAssets: true },
            },
          },
        },
      },
    });

    if (!course) throw new Error("NOT_FOUND: Course not found.");
    if (course.teacherId !== teacher.id) {
      throw new Error("FORBIDDEN: You can only edit your own courses.");
    }

    // Active sync for any pending Mux video uploads
    for (const section of course.sections) {
      for (const lesson of section.lessons) {
        if (lesson.status === "UPLOADING" || lesson.status === "PROCESSING") {
          const videoAsset = (lesson as any).videoAssets?.[0] || await prisma.videoAsset.findFirst({
            where: { lessonId: lesson.id },
          });

          if (videoAsset && videoAsset.provider === "MUX") {
            const syncResult = await syncMuxAssetStatus(videoAsset.uploadId, videoAsset.providerAssetId || undefined);
            if (syncResult) {
              const { status, assetId, playbackId, duration, aspectRatio } = syncResult;
              if (status !== lesson.status) {
                await prisma.videoAsset.update({
                  where: { id: videoAsset.id },
                  data: {
                    ...(assetId ? { providerAssetId: assetId } : {}),
                    ...(playbackId ? { playbackId } : {}),
                    ...(duration ? { duration } : {}),
                    ...(aspectRatio ? { aspectRatio } : {}),
                    status: status as any,
                  },
                });

                await prisma.courseLesson.update({
                  where: { id: lesson.id },
                  data: {
                    status: status as any,
                    ...(duration ? { durationSeconds: Math.round(duration) } : {}),
                  },
                });

                lesson.status = status as any;
                if (duration) lesson.durationSeconds = Math.round(duration);
              }
            }
          }
        }
      }
    }

    // Calculate publish checklist
    const totalLessons = course.sections.reduce((acc, s) => acc + s.lessons.length, 0);
    const hasVideoOrContent = course.sections.some((s) =>
      s.lessons.some(
        (l) =>
          l.type === "VIDEO" ||
          l.type === "TEXT" ||
          Boolean(l.videoUrl) ||
          Boolean(l.videoAssetId) ||
          Boolean(l.content) ||
          (l.resources && l.resources.length > 0)
      )
    );

    let parsedOutcomes: string[] = [];
    if (course.learningOutcomes) {
      try { parsedOutcomes = JSON.parse(course.learningOutcomes); } catch { parsedOutcomes = []; }
    }

    let parsedRequirements: string[] = [];
    if (course.requirements) {
      try { parsedRequirements = JSON.parse(course.requirements); } catch { parsedRequirements = []; }
    }

    const checklist = {
      hasTitle: Boolean(course.title && course.title.trim().length > 3),
      hasDescription: Boolean(course.description && course.description.trim().length > 10),
      hasThumbnail: Boolean(course.thumbnailUrl),
      hasSubject: Boolean(course.subject),
      hasSections: course.sections.length > 0,
      hasLessons: totalLessons > 0,
      hasLessonContent: hasVideoOrContent,
      hasValidPricing: course.price >= 0,
      isPublishable:
        Boolean(course.title && course.title.trim().length > 3) &&
        Boolean(course.description && course.description.trim().length > 10) &&
        Boolean(course.thumbnailUrl) &&
        Boolean(course.subject) &&
        course.sections.length > 0 &&
        totalLessons > 0 &&
        hasVideoOrContent &&
        course.price >= 0,
    };

    return {
      ...course,
      learningOutcomes: parsedOutcomes,
      requirements: parsedRequirements,
      checklist,
    };
  }

  /**
   * Update course basic info & metadata
   */
  static async updateCourse(teacherUserId: string, courseId: string, input: Partial<CreateCourseInput>) {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });

    if (!teacher) throw new Error("UNAUTHORIZED: Not a teacher.");

    const existing = await prisma.course.findUnique({ where: { id: courseId } });
    if (!existing || existing.teacherId !== teacher.id) {
      throw new Error("FORBIDDEN: You do not own this course.");
    }

    let newSlug = existing.slug;
    if (input.title && input.title !== existing.title) {
      newSlug = await LmsService.generateUniqueSlug(input.title, courseId);
    }

    const updateData: any = {};
    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.subtitle !== undefined) updateData.subtitle = input.subtitle.trim();
    if (input.description !== undefined) updateData.description = input.description.trim();
    if (input.subject !== undefined) updateData.subject = input.subject.trim();
    if (input.category !== undefined) updateData.category = input.category.trim();
    if (input.level !== undefined) updateData.level = input.level;
    if (input.gradeLevel !== undefined) updateData.gradeLevel = input.gradeLevel;
    if (input.language !== undefined) updateData.language = input.language;
    if (input.price !== undefined) updateData.price = Number(input.price);
    if (input.thumbnailUrl !== undefined) updateData.thumbnailUrl = input.thumbnailUrl;
    if (newSlug !== existing.slug) updateData.slug = newSlug;

    if (input.learningOutcomes !== undefined) {
      updateData.learningOutcomes = JSON.stringify(input.learningOutcomes);
    }

    if (input.requirements !== undefined) {
      updateData.requirements = JSON.stringify(input.requirements);
    }

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: updateData,
    });

    return updated;
  }

  /**
   * Publish course after checking validation requirements
   */
  static async publishCourse(teacherUserId: string, courseId: string) {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });

    if (!teacher || (teacher.verificationStatus !== "VERIFIED" && teacher.verificationStatus !== "APPROVED")) {
      throw new Error("FORBIDDEN: Educator verification is required before publishing courses.");
    }

    const editorData = await LmsService.getTeacherCourseEditorDetails(teacherUserId, courseId);

    if (!editorData.checklist.isPublishable) {
      const pending: string[] = [];
      if (!editorData.checklist.hasTitle) pending.push("Course Title (min 4 chars)");
      if (!editorData.checklist.hasDescription) pending.push("Course Description (min 11 chars)");
      if (!editorData.checklist.hasThumbnail) pending.push("Course Thumbnail Image");
      if (!editorData.checklist.hasSubject) pending.push("Subject Category");
      if (!editorData.checklist.hasSections) pending.push("At least 1 Section");
      if (!editorData.checklist.hasLessons) pending.push("At least 1 Lesson");
      if (!editorData.checklist.hasLessonContent) pending.push("Lesson Video or Text Content");

      throw new Error(`VALIDATION_FAILED: Cannot publish course. Missing requirements: ${pending.join(", ")}.`);
    }

    // Recalculate duration and lesson count
    const totalDurationSeconds = editorData.sections.reduce((acc, s) => {
      return acc + s.lessons.reduce((lAcc, l) => lAcc + (l.durationSeconds || 0), 0);
    }, 0);
    const durationHours = parseFloat((totalDurationSeconds / 3600).toFixed(1)) || 0.5;
    const totalLessons = editorData.sections.reduce((acc, s) => acc + s.lessons.length, 0);

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        durationHours,
        lessonCount: totalLessons,
      },
    });

    return updated;
  }

  /**
   * Unpublish course
   */
  static async unpublishCourse(teacherUserId: string, courseId: string) {
    const editorData = await LmsService.getTeacherCourseEditorDetails(teacherUserId, courseId);
    return await prisma.course.update({
      where: { id: courseId },
      data: { status: "UNPUBLISHED" },
    });
  }

  /**
   * Archive course
   */
  static async archiveCourse(teacherUserId: string, courseId: string) {
    const editorData = await LmsService.getTeacherCourseEditorDetails(teacherUserId, courseId);
    return await prisma.course.update({
      where: { id: courseId },
      data: { status: "ARCHIVED" },
    });
  }

  /**
   * Duplicate course structure without student data
   */
  static async duplicateCourse(teacherUserId: string, courseId: string) {
    const original = await LmsService.getTeacherCourseEditorDetails(teacherUserId, courseId);

    const newTitle = `${original.title} (Copy)`;
    const newSlug = await LmsService.generateUniqueSlug(newTitle);

    const duplicated = await prisma.course.create({
      data: {
        teacherId: original.teacherId,
        title: newTitle,
        subtitle: original.subtitle,
        slug: newSlug,
        description: original.description,
        subject: original.subject,
        category: original.category,
        level: original.level,
        gradeLevel: original.gradeLevel,
        language: original.language,
        price: original.price,
        thumbnailUrl: original.thumbnailUrl,
        learningOutcomes: original.learningOutcomes ? JSON.stringify(original.learningOutcomes) : null,
        requirements: original.requirements ? JSON.stringify(original.requirements) : null,
        status: "DRAFT",
      },
    });

    // Duplicate sections and lessons
    for (const sec of original.sections) {
      const newSec = await prisma.courseSection.create({
        data: {
          courseId: duplicated.id,
          title: sec.title,
          description: sec.description,
          order: sec.order,
        },
      });

      for (const les of sec.lessons) {
        await prisma.courseLesson.create({
          data: {
            sectionId: newSec.id,
            title: les.title,
            description: les.description,
            type: les.type,
            videoProvider: les.videoProvider,
            videoAssetId: les.videoAssetId,
            videoUrl: les.videoUrl,
            durationSeconds: les.durationSeconds,
            order: les.order,
            isPreview: les.isPreview,
            status: les.status,
            content: les.content,
          },
        });
      }
    }

    return duplicated;
  }

  /**
   * Section Management
   */
  static async createSection(teacherUserId: string, courseId: string, title: string, description?: string) {
    await LmsService.getTeacherCourseEditorDetails(teacherUserId, courseId);

    const count = await prisma.courseSection.count({ where: { courseId } });

    const section = await prisma.courseSection.create({
      data: {
        courseId,
        title: title.trim(),
        description: description?.trim(),
        order: count + 1,
      },
    });
    return section;
  }

  static async updateSection(teacherUserId: string, sectionId: string, title: string, description?: string) {
    const sec = await prisma.courseSection.findUnique({
      where: { id: sectionId },
      include: { course: true },
    });
    if (!sec) throw new Error("NOT_FOUND: Section not found.");

    await LmsService.getTeacherCourseEditorDetails(teacherUserId, sec.courseId);

    return await prisma.courseSection.update({
      where: { id: sectionId },
      data: {
        title: title.trim(),
        description: description !== undefined ? description.trim() : sec.description,
      },
    });
  }

  static async deleteSection(teacherUserId: string, sectionId: string) {
    const sec = await prisma.courseSection.findUnique({
      where: { id: sectionId },
    });
    if (!sec) throw new Error("NOT_FOUND: Section not found.");

    await LmsService.getTeacherCourseEditorDetails(teacherUserId, sec.courseId);

    await prisma.courseSection.delete({ where: { id: sectionId } });
    return true;
  }

  static async reorderSections(teacherUserId: string, courseId: string, sectionIdsInOrder: string[]) {
    await LmsService.getTeacherCourseEditorDetails(teacherUserId, courseId);

    for (let index = 0; index < sectionIdsInOrder.length; index++) {
      const id = sectionIdsInOrder[index];
      await prisma.courseSection.update({
        where: { id },
        data: { order: index + 1 },
      });
    }
    return true;
  }

  /**
   * Lesson Management
   */
  static async createLesson(
    teacherUserId: string,
    sectionId: string,
    input: {
      title: string;
      description?: string;
      type?: string;
      videoProvider?: string;
      videoAssetId?: string;
      videoUrl?: string;
      durationSeconds?: number;
      isPreview?: boolean;
      content?: string;
    }
  ) {
    const sec = await prisma.courseSection.findUnique({
      where: { id: sectionId },
    });
    if (!sec) throw new Error("NOT_FOUND: Section not found.");

    await LmsService.getTeacherCourseEditorDetails(teacherUserId, sec.courseId);

    const count = await prisma.courseLesson.count({ where: { sectionId } });

    const lesson = await prisma.courseLesson.create({
      data: {
        sectionId,
        title: input.title.trim(),
        description: input.description?.trim(),
        type: input.type || "VIDEO",
        videoProvider: input.videoProvider || "LOCAL",
        videoAssetId: input.videoAssetId,
        videoUrl: input.videoUrl,
        durationSeconds: Number(input.durationSeconds) || 0,
        isPreview: Boolean(input.isPreview),
        content: input.content,
        order: count + 1,
      },
    });

    return lesson;
  }

  static async updateLesson(
    teacherUserId: string,
    lessonId: string,
    input: Partial<{
      title: string;
      description: string;
      type: string;
      videoProvider: string;
      videoAssetId: string;
      videoUrl: string;
      durationSeconds: number;
      isPreview: boolean;
      content: string;
    }>
  ) {
    const lesson = await prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { section: true },
    });
    if (!lesson) throw new Error("NOT_FOUND: Lesson not found.");

    await LmsService.getTeacherCourseEditorDetails(teacherUserId, lesson.section.courseId);

    const updateData: any = {};
    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.description !== undefined) updateData.description = input.description.trim();
    if (input.type !== undefined) updateData.type = input.type;
    if (input.videoProvider !== undefined) updateData.videoProvider = input.videoProvider;
    if (input.videoAssetId !== undefined) updateData.videoAssetId = input.videoAssetId;
    if (input.videoUrl !== undefined) updateData.videoUrl = input.videoUrl;
    if (input.durationSeconds !== undefined) updateData.durationSeconds = Number(input.durationSeconds);
    if (input.isPreview !== undefined) updateData.isPreview = Boolean(input.isPreview);
    if (input.content !== undefined) updateData.content = input.content;

    return await prisma.courseLesson.update({
      where: { id: lessonId },
      data: updateData,
    });
  }

  static async deleteLesson(teacherUserId: string, lessonId: string) {
    const lesson = await prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { section: true },
    });
    if (!lesson) throw new Error("NOT_FOUND: Lesson not found.");

    await LmsService.getTeacherCourseEditorDetails(teacherUserId, lesson.section.courseId);

    await prisma.courseLesson.delete({ where: { id: lessonId } });
    return true;
  }

  static async reorderLessons(teacherUserId: string, sectionId: string, lessonIdsInOrder: string[]) {
    const sec = await prisma.courseSection.findUnique({ where: { id: sectionId } });
    if (!sec) throw new Error("NOT_FOUND: Section not found.");

    await LmsService.getTeacherCourseEditorDetails(teacherUserId, sec.courseId);

    for (let index = 0; index < lessonIdsInOrder.length; index++) {
      const id = lessonIdsInOrder[index];
      await prisma.courseLesson.update({
        where: { id },
        data: { order: index + 1 },
      });
    }
    return true;
  }

  /**
   * Attach downloadable resource to lesson
   */
  static async addResource(
    teacherUserId: string,
    lessonId: string,
    data: { name: string; storageKey: string; mimeType: string; size: number }
  ) {
    const lesson = await prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { section: true },
    });
    if (!lesson) throw new Error("NOT_FOUND: Lesson not found.");

    await LmsService.getTeacherCourseEditorDetails(teacherUserId, lesson.section.courseId);

    return await prisma.courseResource.create({
      data: {
        lessonId,
        name: data.name.trim(),
        storageKey: data.storageKey,
        mimeType: data.mimeType,
        size: data.size,
      },
    });
  }

  static async deleteResource(teacherUserId: string, resourceId: string) {
    const res = await prisma.courseResource.findUnique({
      where: { id: resourceId },
      include: { lesson: { include: { section: true } } },
    });
    if (!res) throw new Error("NOT_FOUND: Resource not found.");

    await LmsService.getTeacherCourseEditorDetails(teacherUserId, res.lesson.section.courseId);

    await prisma.courseResource.delete({ where: { id: resourceId } });
    return true;
  }

  /**
   * Student Enrollment Flow
   */
  static async enrollStudent(studentUserId: string, courseId: string) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new Error("NOT_FOUND: Course does not exist.");
    if (course.status !== "PUBLISHED") {
      throw new Error("UNAVAILABLE: Cannot enroll in unpublished course.");
    }

    const existing = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: studentUserId,
          courseId,
        },
      },
    });

    if (existing) {
      if (existing.status === "ACTIVE" || existing.status === "COMPLETED") {
        return { enrollment: existing, alreadyEnrolled: true };
      }
    }

    const initialStatus = course.price === 0 ? "ACTIVE" : "PAYMENT_PENDING";

    const enrollment = await prisma.enrollment.upsert({
      where: {
        studentId_courseId: {
          studentId: studentUserId,
          courseId,
        },
      },
      update: {
        status: initialStatus,
        enrolledAt: new Date(),
      },
      create: {
        studentId: studentUserId,
        courseId,
        status: initialStatus,
      },
    });

    if (initialStatus === "ACTIVE") {
      await prisma.course.update({
        where: { id: courseId },
        data: { enrollmentCount: { increment: 1 } },
      });
    }

    return { enrollment, alreadyEnrolled: false };
  }

  /**
   * Get student's enrolled courses list with continue learning info
   */
  static async getStudentEnrolledCourses(studentUserId: string) {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId: studentUserId,
      },
      orderBy: { updatedAt: "desc" },
      include: {
        course: {
          include: {
            teacher: {
              include: { user: { include: { profile: true } } },
            },
            sections: {
              orderBy: { order: "asc" },
              include: {
                lessons: {
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        },
        lessonProgresses: {
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    const activeOrCompleted = enrollments.filter(
      (e) => e.status === "ACTIVE" || e.status === "COMPLETED"
    );

    const formatted = activeOrCompleted.map((e) => {
      const allLessons: any[] = [];
      e.course.sections.forEach((sec) => {
        sec.lessons.forEach((les) => allLessons.push(les));
      });

      const totalLessons = allLessons.length;
      const completedProgresses = e.lessonProgresses.filter((p) => p.completed);
      const completedCount = completedProgresses.length;
      const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

      // Find last active lesson or first uncompleted lesson
      let lastWatchedProgress = e.lessonProgresses[0];
      let currentLesson = allLessons[0];
      if (lastWatchedProgress) {
        const found = allLessons.find((l) => l.id === lastWatchedProgress.lessonId);
        if (found) currentLesson = found;
      } else {
        const firstUncompleted = allLessons.find(
          (l) => !e.lessonProgresses.some((p) => p.lessonId === l.id && p.completed)
        );
        if (firstUncompleted) currentLesson = firstUncompleted;
      }

      return {
        enrollmentId: e.id,
        status: e.status,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
        progressPercent,
        completedLessons: completedCount,
        totalLessons,
        lastWatchedSeconds: lastWatchedProgress?.progressSeconds || 0,
        currentLesson: currentLesson
          ? {
              id: currentLesson.id,
              title: currentLesson.title,
              type: currentLesson.type,
              durationSeconds: currentLesson.durationSeconds,
            }
          : null,
        course: {
          id: e.course.id,
          title: e.course.title,
          slug: e.course.slug,
          subject: e.course.subject,
          level: e.course.level,
          thumbnailUrl: e.course.thumbnailUrl || "/images/course-placeholder.jpg",
          teacherName: `${e.course.teacher.user.profile?.firstName || ""} ${e.course.teacher.user.profile?.lastName || ""}`.trim() || "Instructor",
          teacherAvatar: e.course.teacher.user.profile?.avatarUrl,
        },
      };
    });

    // Continue learning item
    const continueLearningItem = formatted.find((item) => item.status === "ACTIVE" && item.progressPercent < 100) || formatted[0] || null;

    return {
      enrolledCourses: formatted,
      continueLearning: continueLearningItem,
    };
  }

  /**
   * Secure LMS Learning Classroom Payload
   */
  static async getStudentCourseLearning(studentUserId: string, slug: string) {
    const course = await prisma.course.findUnique({
      where: { slug },
      include: {
        teacher: {
          include: { user: { include: { profile: true } } },
        },
        sections: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              include: { resources: true },
            },
          },
        },
      },
    });

    if (!course) throw new Error("NOT_FOUND: Course not found.");

    // Check enrollment or preview
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: studentUserId,
          courseId: course.id,
        },
      },
      include: {
        lessonProgresses: true,
      },
    });

    const isEnrolled = enrollment?.status === "ACTIVE" || enrollment?.status === "COMPLETED";

    const allLessons: any[] = [];
    course.sections.forEach((s) => s.lessons.forEach((l) => allLessons.push(l)));
    const totalLessons = allLessons.length;
    const completedProgresses = enrollment?.lessonProgresses.filter((p) => p.completed) || [];
    const completedCount = completedProgresses.length;
    const overallProgressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    const formattedSections = course.sections.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      lessons: s.lessons.map((l) => {
        const prog = enrollment?.lessonProgresses.find((p) => p.lessonId === l.id);
        const isAccessible = isEnrolled || l.isPreview;

        return {
          id: l.id,
          title: l.title,
          description: l.description,
          type: l.type,
          durationSeconds: l.durationSeconds,
          isPreview: l.isPreview,
          isAccessible,
          isCompleted: Boolean(prog?.completed),
          progressSeconds: prog?.progressSeconds || 0,
          videoUrl: isAccessible ? l.videoUrl || (l.videoAssetId ? `/api/videos/${l.videoAssetId}/stream` : null) : null,
          content: isAccessible ? l.content : null,
          resources: isAccessible ? l.resources : [],
        };
      }),
    }));

    return {
      courseId: course.id,
      title: course.title,
      slug: course.slug,
      subject: course.subject,
      level: course.level,
      isEnrolled,
      enrollmentId: enrollment?.id,
      overallProgressPercent,
      completedLessonsCount: completedCount,
      totalLessonsCount: totalLessons,
      teacher: {
        name: `${course.teacher.user.profile?.firstName || ""} ${course.teacher.user.profile?.lastName || ""}`.trim(),
        avatarUrl: course.teacher.user.profile?.avatarUrl,
      },
      sections: formattedSections,
    };
  }

  /**
   * Update video progress & check completion threshold (>=90%)
   */
  static async updateLessonProgress(
    studentUserId: string,
    lessonId: string,
    progressSeconds: number,
    forceComplete: boolean = false
  ) {
    const lesson = await prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { section: { include: { course: true } } },
    });

    if (!lesson) throw new Error("NOT_FOUND: Lesson not found.");

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: studentUserId,
          courseId: lesson.section.courseId,
        },
      },
    });

    if (!enrollment || (enrollment.status !== "ACTIVE" && enrollment.status !== "COMPLETED")) {
      throw new Error("UNAUTHORIZED: Active enrollment required to track progress.");
    }

    // Determine completion (90% threshold for video, or manual forceComplete)
    let isCompleted = forceComplete;
    if (!isCompleted && lesson.durationSeconds > 0) {
      const percentWatched = (progressSeconds / lesson.durationSeconds) * 100;
      if (percentWatched >= 90) {
        isCompleted = true;
      }
    } else if (!isCompleted && lesson.type === "TEXT") {
      isCompleted = true;
    }

    const existingProg = await prisma.lessonProgress.findUnique({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId,
        },
      },
    });

    const now = new Date();
    const completedState = Boolean(existingProg?.completed || isCompleted);

    const progressRecord = await prisma.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId,
        },
      },
      update: {
        progressSeconds: Math.max(existingProg?.progressSeconds || 0, Math.round(progressSeconds)),
        completed: completedState,
        completedAt: completedState && !existingProg?.completed ? now : existingProg?.completedAt,
        lastWatchedAt: now,
      },
      create: {
        enrollmentId: enrollment.id,
        lessonId,
        progressSeconds: Math.round(progressSeconds),
        completed: completedState,
        completedAt: completedState ? now : null,
      },
    });

    // Check overall course completion state
    const allCourseLessons = await prisma.courseLesson.findMany({
      where: { section: { courseId: lesson.section.courseId } },
    });

    const allProgresses = await prisma.lessonProgress.findMany({
      where: { enrollmentId: enrollment.id },
    });

    const completedCount = allProgresses.filter((p) => p.completed).length;
    const totalCount = allCourseLessons.length;
    const isCourse100Percent = totalCount > 0 && completedCount >= totalCount;

    if (isCourse100Percent && enrollment.status !== "COMPLETED") {
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          status: "COMPLETED",
          completedAt: now,
        },
      });

      await prisma.courseCompletion.upsert({
        where: { enrollmentId: enrollment.id },
        update: { completedAt: now },
        create: {
          enrollmentId: enrollment.id,
          completedAt: now,
        },
      });
    }

    return {
      progress: progressRecord,
      lessonCompleted: completedState,
      courseCompleted: isCourse100Percent,
      completedLessons: completedCount,
      totalLessons: totalCount,
      progressPercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    };
  }

  /**
   * Create course review for eligible enrolled student
   */
  static async createCourseReview(studentUserId: string, courseId: string, rating: number, reviewText: string) {
    if (rating < 1 || rating > 5) {
      throw new Error("VALIDATION_FAILED: Rating must be between 1 and 5.");
    }
    if (!reviewText || reviewText.trim().length < 5) {
      throw new Error("VALIDATION_FAILED: Review text must be at least 5 characters long.");
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: studentUserId,
          courseId,
        },
      },
    });

    if (!enrollment || (enrollment.status !== "ACTIVE" && enrollment.status !== "COMPLETED")) {
      throw new Error("UNAUTHORIZED: Only enrolled students can review this course.");
    }

    const review = await prisma.courseReview.create({
      data: {
        courseId,
        studentId: studentUserId,
        enrollmentId: enrollment.id,
        rating: Math.round(rating),
        review: reviewText.trim(),
      },
    });

    // Recalculate average rating for course
    const aggregate = await prisma.courseReview.aggregate({
      where: { courseId },
      _avg: { rating: true },
      _count: { id: true },
    });

    const newAvg = parseFloat((aggregate._avg.rating || 5.0).toFixed(1));
    const newCount = aggregate._count.id || 0;

    await prisma.course.update({
      where: { id: courseId },
      data: {
        rating: newAvg,
        reviewCount: newCount,
      },
    });

    return review;
  }

  /**
   * Verify access permission for video playback stream
   */
  static async verifyVideoAccess(userId: string | null, assetIdOrLessonId: string) {
    const lesson = await prisma.courseLesson.findFirst({
      where: {
        OR: [{ id: assetIdOrLessonId }, { videoAssetId: assetIdOrLessonId }],
      },
      include: {
        section: {
          include: { course: true },
        },
      },
    });

    if (!lesson) return { allowed: false, error: "Lesson video not found" };

    // Preview lessons accessible publicly
    if (lesson.isPreview) {
      return { allowed: true, lesson };
    }

    if (!userId) {
      return { allowed: false, error: "Authentication required to view protected video" };
    }

    // Teacher owner access
    const teacher = await prisma.teacherProfile.findUnique({ where: { userId } });
    if (teacher && teacher.id === lesson.section.course.teacherId) {
      return { allowed: true, lesson };
    }

    // Admin access
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.role === "ADMIN") {
      return { allowed: true, lesson };
    }

    // Student active enrollment check
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: userId,
          courseId: lesson.section.courseId,
        },
      },
    });

    if (enrollment && (enrollment.status === "ACTIVE" || enrollment.status === "COMPLETED")) {
      return { allowed: true, lesson };
    }

    return { allowed: false, error: "Course enrollment required to access protected lesson" };
  }

  /**
   * Admin course moderation methods
   */
  static async getAdminCourses() {
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        teacher: {
          include: { user: { include: { profile: true } } },
        },
        _count: {
          select: { sections: true, enrollments: true },
        },
      },
    });

    return courses.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      subject: c.subject,
      category: c.category,
      price: c.price,
      status: c.status,
      rating: c.rating,
      createdAt: c.createdAt,
      teacherName: `${c.teacher.user.profile?.firstName || ""} ${c.teacher.user.profile?.lastName || ""}`.trim(),
      teacherEmail: c.teacher.user.email,
      sectionsCount: c._count.sections,
      enrollmentsCount: c._count.enrollments,
    }));
  }

  static async updateCourseStatusAdmin(courseId: string, status: string) {
    if (!["PUBLISHED", "UNPUBLISHED", "ARCHIVED", "DRAFT"].includes(status)) {
      throw new Error("INVALID_STATUS: Allowed statuses are PUBLISHED, UNPUBLISHED, ARCHIVED, DRAFT.");
    }
    return await prisma.course.update({
      where: { id: courseId },
      data: { status },
    });
  }

  /**
   * Get enrolled students for a specific course with progress
   */
  static async getCourseStudents(teacherUserId: string, courseId: string) {
    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });
    if (!teacher) throw new Error("Teacher profile required.");

    const course = await prisma.course.findFirst({
      where: { id: courseId, teacherId: teacher.id },
      include: {
        sections: { include: { lessons: true } },
      },
    });

    if (!course) throw new Error("Course not found or unauthorized.");

    const totalLessons = course.sections.reduce((acc, s) => acc + s.lessons.length, 0);

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        lessonProgresses: true,
      },
      orderBy: { enrolledAt: "desc" },
    });

    return enrollments.map((e) => {
      const completedLessonsCount = e.lessonProgresses.filter((p) => p.completed).length;
      const progressPercentage = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;
      const lastActive = e.lessonProgresses.reduce((latest, p) => {
        return !latest || (p.lastWatchedAt && p.lastWatchedAt > latest) ? p.lastWatchedAt : latest;
      }, e.enrolledAt);

      return {
        id: e.id,
        studentId: e.student.id,
        email: e.student.email,
        name: `${e.student.profile?.firstName || ""} ${e.student.profile?.lastName || ""}`.trim() || e.student.email,
        avatarUrl: e.student.profile?.avatarUrl,
        enrolledAt: e.enrolledAt,
        status: e.status,
        completedLessonsCount,
        totalLessons,
        progressPercentage,
        lastActive,
      };
    });
  }
}
