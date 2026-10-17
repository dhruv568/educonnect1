"use client";

import React from "react";
import { NotFoundView } from "@/components/ui/error/not-found-view";

export default function TeacherNotFound() {
  return (
    <NotFoundView
      portalName="Educator Portal"
      homeUrl="/teacher/dashboard"
      description="The educator feature, live class slot, or curriculum editor item was not found."
    />
  );
}
