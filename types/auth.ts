export type UserRole = "ADMIN" | "STAFF" | "TEACHER" | "STUDENT";

export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";

export type DocumentCategory = "IDENTITY" | "QUALIFICATION" | "CERTIFICATE" | "EXPERIENCE" | "CANCELLED_CHEQUE" | "OTHER";

export type TeachingMode = "ONLINE" | "OFFLINE" | "BOTH";

export interface UserSession {
  id: string;
  userId?: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  name?: string;
  avatarUrl?: string | null;
  status?: string;
  roleId?: string | null;
  roleName?: string | null;
  permissions?: string[];
  features?: string[];
}

export interface DynamicNavItem {
  key: string;
  label: string;
  href: string;
  icon: string;
  moduleGroup: string;
  sortOrder: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  alreadyVerified?: boolean;
  user?: UserSession;
  redirectPath?: string;
}

export interface QualificationItem {
  id: string;
  teacherId: string;
  degree: string;
  institution: string;
  specialization?: string | null;
  year: number;
  description?: string | null;
  createdAt: string;
}

export interface CertificateItem {
  id: string;
  teacherId: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string | null;
  documentId?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  teacherId: string;
  category: DocumentCategory;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageKey: string;
  status: string;
  uploadedAt: string;
}

export interface VerificationHistoryItem {
  id: string;
  teacherId: string;
  adminId?: string | null;
  adminName?: string | null;
  previousStatus: VerificationStatus;
  newStatus: VerificationStatus;
  reason?: string | null;
  createdAt: string;
}

export interface AdminNoteItem {
  id: string;
  teacherId: string;
  adminId: string;
  adminName: string;
  content: string;
  createdAt: string;
}

export interface VerificationReadiness {
  isReady: boolean;
  completionPercentage: number;
  missingItems: string[];
}
