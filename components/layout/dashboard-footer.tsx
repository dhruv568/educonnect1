import React from "react";
import { OFFICIAL_COMPANY_INFO } from "@/lib/company";

export function DashboardFooter() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="w-full py-6 mt-auto border-t border-slate-200/80 bg-white/50 text-center text-xs text-slate-500 font-medium">
      <p>© {currentYear} {OFFICIAL_COMPANY_INFO.legalName || "Shrivastava ProFunnels Ventures Pvt Ltd"}</p>
      <p className="text-[11px] text-slate-400 opacity-60 mt-0.5">
        Brand Name: {OFFICIAL_COMPANY_INFO.brandName || "EduConnect"}
      </p>
    </footer>
  );
}
