import { NextRequest } from "next/server";
import { LmsService } from "@/services/lms-service";
import { requireVerifiedEducator } from "@/lib/auth/guards";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireVerifiedEducator();
    const { id } = await params;

    const course = await LmsService.publishCourse(session.userId, id);
    return apiSuccess({ message: "Course published successfully!", course });
  } catch (error: any) {
    return handleApiError(error);
  }
}
