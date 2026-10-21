export * from "./verification-email";
export * from "./password-reset-email";
export * from "./verification-templates";
export * from "./certificate-email";
export * from "./email-footer";
export * from "./welcome-email";


export interface TeacherVerificationStatusEmailParams {
  email: string;
  userName: string;
  status: "APPROVED" | "REJECTED" | "SUSPENDED";
  reason?: string;
}

export interface BookingEmailParams {
  email: string;
  userName: string;
  teacherName: string;
  slotTime: string;
}
