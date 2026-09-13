export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";
import { logAuditEvent } from "@/lib/audit-logger";

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireRole(["TEACHER"]);
    const body = await request.json();

    const {
      firstName,
      lastName,
      avatarUrl,
      phone,
      bio,
      location,
      headline,
      subjects, // string or string[]
      languages, // string or string[]
      experienceYears,
      hourlyRate,
      teachingMode,
      accountHolderName,
      accountNumber,
      bankName,
      ifscCode,
      cancelledChequeUrl,
    } = body;

    const subjectsStr = Array.isArray(subjects) ? subjects.join(", ") : subjects;
    const languagesStr = Array.isArray(languages) ? languages.join(", ") : languages;

    // Update Profile
    await prisma.profile.update({
      where: { userId: session.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(phone !== undefined && { phone }),
        ...(bio !== undefined && { bio }),
      },
    });

    // Update TeacherProfile
    const updatedTeacher = await prisma.teacherProfile.update({
      where: { userId: session.id },
      data: {
        ...(bio !== undefined && { bio }),
        ...(phone !== undefined && { contactPhone: phone }),
        ...(location !== undefined && { location }),
        ...(headline !== undefined && { headline }),
        ...(subjectsStr !== undefined && { subjects: subjectsStr }),
        ...(languagesStr !== undefined && { languages: languagesStr }),
        ...(experienceYears !== undefined && { experienceYears: Number(experienceYears) }),
        ...(hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) }),
        ...(teachingMode !== undefined && { teachingMode }),
        ...(accountHolderName !== undefined && { accountHolderName }),
        ...(accountNumber !== undefined && { accountNumber }),
        ...(bankName !== undefined && { bankName }),
        ...(ifscCode !== undefined && { ifscCode: ifscCode ? ifscCode.toUpperCase().trim() : ifscCode }),
        ...(cancelledChequeUrl !== undefined && { cancelledChequeUrl }),
      },
    });

    await logAuditEvent(session.id, "TEACHER_PROFILE_UPDATED", {
      userId: session.id,
      teacherProfileId: updatedTeacher.id,
    });

    return apiSuccess({
      message: "Teacher profile updated successfully",
      teacherProfile: updatedTeacher,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
