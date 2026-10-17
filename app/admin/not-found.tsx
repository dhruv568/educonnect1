"use client";

import React from "react";
import { NotFoundView } from "@/components/ui/error/not-found-view";

export default function AdminNotFound() {
  return (
    <NotFoundView
      portalName="Admin Panel"
      homeUrl="/admin"
      description="The admin governance module, report, or configuration page does not exist."
    />
  );
}
