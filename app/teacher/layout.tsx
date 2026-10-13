import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "EduConnects for Educators",
  description:
    "Turn your knowledge into impact. Build your verified educator brand, conduct high-definition live classes, sell recorded video courses, and receive automated payouts on EduConnects.",
  alternates: {
    canonical: "https://educators.educonnects.co.in/",
  },
};

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-theme="educator" className="theme-educator min-h-screen text-slate-900">
      {children}
    </div>
  );
}
