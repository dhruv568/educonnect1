import { getSession } from "@/lib/auth/session";
import { UserRole, UserSession } from "@/types/auth";
import { prisma } from "@/lib/prisma";

export {
  isEducatorRole,
  isLearnerRole,
  isAdminRole,
  getDashboardPathForRole,
  matchesRole,
} from "@/lib/auth/roles";
import { isEducatorRole, isLearnerRole, matchesRole } from "@/lib/auth/roles";

export async function requireAuth(): Promise<UserSession & { userId: string }> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED: Session expired or invalid.");
  }
  const userId = session.userId || session.id;

  // Real-time verification of user active status
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, role: true },
  });

  if (!dbUser) {
    throw new Error("UNAUTHORIZED: User account not found.");
  }

  if (dbUser.status !== "ACTIVE") {
    throw new Error("FORBIDDEN: User account is deactivated or suspended. Access denied.");
  }

  return { ...session, id: userId, userId, role: dbUser.role as UserRole };
}

export async function requireVerifiedEmail(): Promise<UserSession & { userId: string }> {
  const session = await requireAuth();
  if (!session.emailVerified) {
    throw new Error("UNVERIFIED: Email verification required to access this feature.");
  }
  return session;
}

export async function requireRole(allowedRoles: string | string[]): Promise<UserSession & { userId: string }> {
  const session = await requireVerifiedEmail();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const hasMatch = roles.some((role) => matchesRole(session.role, role));
  if (!hasMatch) {
    throw new Error(`FORBIDDEN: Access restricted to roles [${roles.join(", ")}].`);
  }
  return session;
}

export async function requireStaffOrAdmin(): Promise<UserSession & { userId: string }> {
  return requireRole(["ADMIN", "STAFF"]);
}

export const EDUCATOR_VERIFICATION_PENDING_MESSAGE =
  "Your educator account is pending verification. Teaching, live classes, course publishing, and content publishing will be available after verification.";

export function isEducatorVerified(target?: { verificationStatus?: string | null } | string | null): boolean {
  if (!target) return false;
  const status = typeof target === "string" ? target : target?.verificationStatus;
  return status === "VERIFIED" || status === "APPROVED";
}

export async function requireVerifiedEducator(): Promise<UserSession & { userId: string; teacherProfile: any }> {
  const session = await requireRole(["EDUCATOR", "TEACHER"]);
  let teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: session.userId },
  });

  if (!teacherProfile) {
    teacherProfile = await prisma.teacherProfile.create({
      data: {
        userId: session.userId,
        headline: "Educator",
        teachingMode: "ONLINE",
        verificationStatus: "PENDING",
        isSeededProfile: false,
      },
    });
  }

  if (teacherProfile.isSeededProfile) {
    throw new Error("FORBIDDEN: Seeded public profile cannot access educator dashboard or privileges.");
  }

  const isVerified = isEducatorVerified(teacherProfile);

  if (!isVerified) {
    throw new Error(`FORBIDDEN: ${EDUCATOR_VERIFICATION_PENDING_MESSAGE}`);
  }

  return { ...session, teacherProfile };
}

export {
  requirePermission,
  requireAnyPermission,
  requireFeature,
  getUserAuthorization,
  hasPermission,
  hasFeature,
} from "@/lib/permissions/permission-engine";


