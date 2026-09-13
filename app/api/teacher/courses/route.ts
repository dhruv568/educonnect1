import { NextRequest } from "next/server";
import { LmsService } from "@/services/lms-service";
import { requireRole, requireVerifiedEducator } from "@/lib/auth/guards";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(["TEACHER"]);
    const data = await LmsService.getTeacherCourses(session.userId);
    return apiSuccess(data);
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireVerifiedEducator();
    const body = await request.json();

    const course = await LmsService.createTeacherCourse(session.userId, {
      title: body.title,
      subtitle: body.subtitle,
      description: body.description,
      subject: body.subject,
      category: body.category,
      level: body.level,
      gradeLevel: body.gradeLevel,
      language: body.language,
      price: Number(body.price) || 0,
      thumbnailUrl: body.thumbnailUrl,
      learningOutcomes: body.learningOutcomes,
      requirements: body.requirements,
    });

    return apiSuccess({
      message: "Course created successfully!",
      course,
    }, 201);
  } catch (error: any) {
    return handleApiError(error);
  }
}
