"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { UserRole } from "@/types/auth";
import { useRouter } from "next/navigation";

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: UserRole;
  initialMode?: "register" | "login";
}

export function AuthModal({ isOpen, onClose, initialRole = "STUDENT", initialMode = "register" }: AuthModalProps) {
  const [mode, setMode] = useState<"register" | "login">(initialMode);
  const [role, setRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, firstName, lastName, role }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Registration failed.");

        showToast("Account Created!", "Verification code sent to your email.", "success", true);
        onClose();
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Login failed.");

        if (data.data?.requiresVerification || data.data?.requiresOtp) {
          showToast("Verification Code Sent ✉️", "Please enter the 6-digit OTP code sent to your email to complete login.", "info");
        } else {
          showToast("Welcome Back!", `Signed in as ${data.data.user.firstName}`, "success");
        }
        onClose();
        router.push(data.data.redirectPath || `/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch (err: any) {
      showToast("Authentication Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-full hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-6">
            <span className="text-xs font-bold text-[#16805B] uppercase tracking-widest">
              EduConnects Access
            </span>
            <h2 className="text-2xl font-extrabold text-[#0F172A] mt-1">
              {mode === "register" ? "Create Account" : "Sign In to EduConnects"}
            </h2>
            <p className="text-sm text-[#475569] mt-1">
              {mode === "register"
                ? "Join thousands of teachers and students."
                : "Welcome back! Enter your credentials to continue."}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-[#F8FAFC] p-1 rounded-xl mb-6 border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${
                mode === "register" ? "bg-white text-[#16805B] shadow-sm" : "text-[#475569] hover:text-[#0F172A]"
              }`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${
                mode === "login" ? "bg-white text-[#16805B] shadow-sm" : "text-[#475569] hover:text-[#0F172A]"
              }`}
            >
              Login
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <>
                {/* Role selection pills */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-2">
                    I am joining as:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["TEACHER", "STUDENT"] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`text-xs font-bold py-2 px-3 rounded-xl border transition-all ${
                          role === r
                            ? "border-[#16805B] bg-[#F0FAF5] text-[#16805B] shadow-sm"
                            : "border-[#E2E8F0] text-[#475569] hover:border-[#16805B]"
                        }`}
                      >
                        {r.charAt(0) + r.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="First Name"
                    placeholder="Sarah"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    leftIcon={<User className="h-4 w-4" />}
                  />
                  <Input
                    label="Last Name"
                    placeholder="Jenkins"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              leftIcon={<Mail className="h-4 w-4" />}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              leftIcon={<Lock className="h-4 w-4" />}
              helperText={mode === "register" ? "At least 8 characters, 1 uppercase, 1 number" : undefined}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={loading}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              {mode === "register" ? "Create Account & Send Code" : "Sign In"}
            </Button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
