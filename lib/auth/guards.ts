import { getSession } from "@/lib/auth/session";
import { UserRole, UserSession } from "@/types/auth";
import { prisma } from "@/lib/prisma";

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

  return { ...session, userId, role: dbUser.role as UserRole };
}

export async function requireVerifiedEmail(): Promise<UserSession & { userId: string }> {
  const session = await requireAuth();
  if (!session.emailVerified) {
    throw new Error("UNVERIFIED: Email verification required to access this feature.");
  }
  return session;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<UserSession & { userId: string }> {
  const session = await requireVerifiedEmail();
  if (!allowedRoles.includes(session.role)) {
    throw new Error(`FORBIDDEN: Access restricted to roles [${allowedRoles.join(", ")}].`);
  }
  return session;
}

export async function requireStaffOrAdmin(): Promise<UserSession & { userId: string }> {
  return requireRole(["ADMIN", "STAFF"]);
}

export async function requireVerifiedEducator(): Promise<UserSession & { userId: string; teacherProfile: any }> {
  const session = await requireRole(["TEACHER"]);
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: session.userId },
  });

  if (!teacherProfile) {
    throw new Error("NOT_FOUND: Educator profile record not found.");
  }

  const isVerified =
    teacherProfile.verificationStatus === "VERIFIED" ||
    teacherProfile.verificationStatus === "APPROVED";

  if (!isVerified) {
    if (teacherProfile.verificationStatus === "PENDING") {
      throw new Error("FORBIDDEN: Educator verification is under review. You will be notified once approved.");
    }
    throw new Error("FORBIDDEN: Educator verification is required before using this feature.");
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


