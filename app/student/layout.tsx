import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "EduConnects for Learners",
  description:
    "Connect with verified top-tier educators, join interactive live video classrooms with real-time digital whiteboards, and master structured self-paced courses on EduConnects.",
  alternates: {
    canonical: "https://learners.educonnects.co.in/",
  },
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-theme="learner" className="theme-learner min-h-screen text-slate-900">
      {children}
    </div>
  );
}
