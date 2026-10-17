"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap, ArrowLeft, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface NotFoundViewProps {
  portalName?: "EduConnects" | "Learner Portal" | "Educator Portal" | "Admin Panel";
  homeUrl?: string;
  description?: string;
}

export function NotFoundView({
  portalName = "EduConnects",
  homeUrl = "/",
  description = "Oops! The page or resource you are looking for does not exist or has been moved.",
}: NotFoundViewProps) {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 bg-slate-50 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-200 space-y-6">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <GraduationCap className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="text-4xl font-black text-blue-600 block">404</span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Page Not Found</h1>
          <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
        </div>

        <div className="pt-2 flex flex-col gap-2.5">
          <Link href={homeUrl} className="w-full">
            <Button variant="gradient" className="w-full" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Return to {portalName}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
