import { z } from "zod";

export const RoleEnum = z.enum(["ADMIN", "TEACHER", "STUDENT"]);

export const RegisterSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phone: z.string().optional(),
  role: RoleEnum.default("STUDENT"),
  educationType: z.string().optional(),
  gradeLevel: z.string().optional(),
  stream: z.string().optional(),
  competitiveExam: z.string().optional(),
  diplomaBranch: z.string().optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().optional(),
  otp: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must contain only numbers").optional(),
  returnTo: z.string().optional(),
  redirectTo: z.string().optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const VerifyOTPSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  otp: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must contain only numbers"),
  returnTo: z.string().optional(),
  redirectTo: z.string().optional(),
});

export type VerifyOTPInput = z.infer<typeof VerifyOTPSchema>;

export const ResendVerificationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export type ResendVerificationInput = z.infer<typeof ResendVerificationSchema>;

export const ContactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  roleType: z.enum(["STUDENT", "TEACHER", "GENERAL"]).default("GENERAL"),
});

export type ContactInput = z.infer<typeof ContactSchema>;
